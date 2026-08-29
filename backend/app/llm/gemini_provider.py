from __future__ import annotations
import asyncio
import base64
import json
import os
import time
from typing import Any

from ..schemas import ActionProposal, BrowserObservation, WorkflowDefinition, WorkflowStep
from .decision_schema import DecisionValidator
from .prompts import SYSTEM_PROMPT, VISION_PROMPT, decision_prompt
from .provider import LLMProvider

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Global rate limiter semaphore to serialize LLM requests without holding lock during sleeps
GEMINI_RATE_LIMITER = asyncio.Semaphore(1)

GEMINI_MODEL_HIERARCHY = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
]


def extract_text_content(content: Any) -> str:
    """Extract plain text string from LangChain message content regardless of structure."""
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict):
                if 'text' in part:
                    text_parts.append(str(part['text']))
                elif 'content' in part:
                    text_parts.append(str(part['content']))
        return ''.join(text_parts)
    elif isinstance(content, dict):
        return str(content.get('text', content.get('content', str(content))))
    return str(content)


class GeminiProvider(LLMProvider):
    """Google Gemini API Provider implementation with non-blocking rate limiting and automatic Ollama fallback."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')
        self.api_key = api_key or os.getenv('GEMINI_API_KEY') or os.getenv('API_KEY')
        self.validator = DecisionValidator()

    @property
    def provider_name(self) -> str:
        return 'gemini'

    @property
    def model_name(self) -> str:
        return self.model

    async def decide(
        self,
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        observation: BrowserObservation,
        history: list[dict[str, Any]],
        workflow_values: dict[str, str] | None = None,
    ) -> tuple[ActionProposal, dict[str, Any]]:
        """Decide with non-blocking quota-aware retry logic and automatic Ollama fallback."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")

        prompt = decision_prompt(workflow, step, observation, history, workflow.constraints.get('allowed_actions', []), workflow_values)
        return await self._decide_with_retry(workflow, step, observation, history, prompt, max_retries=2)

    async def _decide_with_retry(
        self,
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        observation: BrowserObservation,
        history: list[dict[str, Any]],
        prompt: str,
        max_retries: int = 2,
    ) -> tuple[ActionProposal, dict[str, Any]]:
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        models_to_try = [self.model] + [m for m in GEMINI_MODEL_HIERARCHY if m != self.model]
        last_exception = None
        
        for model in models_to_try:
            for attempt in range(max_retries):
                try:
                    llm = ChatGoogleGenerativeAI(
                        model=model,
                        google_api_key=self.api_key,
                        response_mime_type="application/json",
                        request_timeout=6.0,
                        max_retries=0,
                    )
                    
                    start_time = time.perf_counter()
                    # Acquire lock ONLY for the network request (release before sleeping or handling response)
                    async with GEMINI_RATE_LIMITER:
                        message = await llm.ainvoke([
                            ('system', SYSTEM_PROMPT),
                            ('human', prompt)
                        ])
                    end_time = time.perf_counter()
                    
                    inference_ms = (end_time - start_time) * 1000.0
                    content = extract_text_content(message.content)
                    
                    usage_meta = getattr(message, 'usage_metadata', {}) or {}
                    prompt_tokens = usage_meta.get('input_tokens', len(prompt) // 4)
                    completion_tokens = usage_meta.get('output_tokens', len(content) // 4)
                    tokens_per_sec = (completion_tokens / (inference_ms / 1000.0)) if inference_ms > 0 else 0.0

                    telemetry = {
                        'provider': self.provider_name,
                        'model': model,
                        'prompt_tokens': int(prompt_tokens),
                        'completion_tokens': int(completion_tokens),
                        'total_tokens': int(prompt_tokens + completion_tokens),
                        'inference_ms': round(inference_ms, 2),
                        'tokens_per_sec': round(tokens_per_sec, 2),
                        'attempt': attempt + 1,
                    }

                    proposal = self.validator.validate(content)
                    return proposal, telemetry
                    
                except Exception as exc:
                    last_exception = exc
                    err_str = str(exc)
                    is_quota_error = any(
                        keyword in err_str.lower() 
                        for keyword in ['quota', 'resource_exhausted', '429', 'too_many_requests', 'rate_limit']
                    )
                    
                    if is_quota_error:
                        print(
                            f"[GeminiProvider] Model '{model}' rate-limited (attempt {attempt+1}/{max_retries}). "
                            f"Error: {err_str[:110]}...",
                            flush=True
                        )
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1.0)
                    else:
                        print(f"[GeminiProvider] Model '{model}' non-quota error: {err_str[:100]}...", flush=True)
                        break
        
        # All Gemini models rate-limited — fallback to local Ollama
        print(f"[GeminiProvider] All Gemini API models rate-limited. Automatically falling back to local Ollama...", flush=True)
        try:
            from .ollama_client import OllamaDecisionClient
            ollama = OllamaDecisionClient()
            return await ollama.decide(workflow, step, observation, history)
        except Exception as fallback_exc:
            raise RuntimeError(
                f"[GeminiProvider] LLM decision failed after Gemini ({last_exception}) "
                f"and Ollama fallback ({fallback_exc})."
            )

    async def vision_fallback(self, goal: str, image_bytes: bytes) -> dict[str, Any]:
        if not self.api_key:
            return {'vision_analysis': 'Gemini API key missing', 'status': 'REQUEST_VISION_FAILED', 'provider': self.provider_name}

        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(model=self.model, google_api_key=self.api_key)

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        prompt_text = VISION_PROMPT.replace('{goal}', goal)

        start_time = time.perf_counter()
        try:
            async with GEMINI_RATE_LIMITER:
                message = await llm.ainvoke([
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt_text},
                            {'type': 'image_url', 'image_url': f'data:image/png;base64,{base64_image}'}
                        ]
                    }
                ])
            end_time = time.perf_counter()
            text = extract_text_content(message.content)
            return {
                'vision_analysis': text,
                'status': 'REQUEST_VISION_SUCCESS',
                'inference_ms': round((end_time - start_time) * 1000.0, 2),
                'provider': self.provider_name,
                'model': self.model,
            }
        except Exception as exc:
            return {
                'vision_analysis': f'Gemini Vision fallback error: {exc}',
                'status': 'REQUEST_VISION_FAILED',
                'provider': self.provider_name,
            }
