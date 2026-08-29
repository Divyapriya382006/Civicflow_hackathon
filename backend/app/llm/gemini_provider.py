from __future__ import annotations
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

class GeminiProvider(LLMProvider):
    """Google Gemini API Provider implementation with structured JSON output and multimodal vision support."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or os.getenv('GEMINI_MODEL', 'gemini-3.7-flash')
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
    ) -> tuple[ActionProposal, dict[str, Any]]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")

        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=0,
            response_mime_type="application/json",
        )

        prompt = decision_prompt(workflow, step, observation, history, workflow.constraints.get('allowed_actions', []))
        
        start_time = time.perf_counter()
        message = await llm.ainvoke([
            ('system', SYSTEM_PROMPT),
            ('human', prompt)
        ])
        end_time = time.perf_counter()

        inference_ms = (end_time - start_time) * 1000.0
        content = message.content if isinstance(message.content, str) else ''.join(str(part) for part in message.content)
        
        usage_meta = getattr(message, 'usage_metadata', {}) or {}
        prompt_tokens = usage_meta.get('input_tokens', len(prompt) // 4)
        completion_tokens = usage_meta.get('output_tokens', len(content) // 4)
        tokens_per_sec = (completion_tokens / (inference_ms / 1000.0)) if inference_ms > 0 else 0.0

        telemetry = {
            'provider': self.provider_name,
            'model': self.model,
            'prompt_tokens': int(prompt_tokens),
            'completion_tokens': int(completion_tokens),
            'total_tokens': int(prompt_tokens + completion_tokens),
            'inference_ms': round(inference_ms, 2),
            'tokens_per_sec': round(tokens_per_sec, 2),
        }

        proposal = self.validator.validate(content)
        return proposal, telemetry

    async def vision_fallback(self, goal: str, image_bytes: bytes) -> dict[str, Any]:
        if not self.api_key:
            return {'vision_analysis': 'Gemini API key missing', 'status': 'REQUEST_VISION_FAILED', 'provider': self.provider_name}

        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(model=self.model, google_api_key=self.api_key, temperature=0)

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        prompt_text = VISION_PROMPT.replace('{goal}', goal)

        start_time = time.perf_counter()
        try:
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
            text = message.content if isinstance(message.content, str) else ''.join(str(part) for part in message.content)
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
