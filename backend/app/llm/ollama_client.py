from __future__ import annotations
import base64
import json
import os
import time
from typing import Any
from langchain_ollama import ChatOllama

from ..schemas import ActionProposal, BrowserObservation, WorkflowDefinition, WorkflowStep
from .decision_schema import DecisionValidator
from .prompts import SYSTEM_PROMPT, VISION_PROMPT, decision_prompt
from .provider import LLMProvider


class OllamaDecisionClient(LLMProvider):
    """Local Ollama LLM & Vision Provider implementation."""

    def __init__(self, model: str | None = None, vision_model: str | None = None, base_url: str | None = None):
        self.model = model or os.getenv('OLLAMA_MODEL', 'llama3:latest')
        self.vision_model = vision_model or os.getenv('OLLAMA_VISION_MODEL', 'llava:latest')
        self.base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
        self.llm = ChatOllama(model=self.model, base_url=self.base_url, temperature=0, format='json')
        self.vision_llm = ChatOllama(model=self.vision_model, base_url=self.base_url, temperature=0)
        self.validator = DecisionValidator()

    @property
    def provider_name(self) -> str:
        return 'ollama'

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
        prompt = decision_prompt(workflow, step, observation, history, workflow.constraints.get('allowed_actions', []), workflow_values)
        
        start_time = time.perf_counter()
        message = await self.llm.ainvoke([
            ('system', SYSTEM_PROMPT),
            ('human', prompt)
        ])
        end_time = time.perf_counter()

        inference_ms = (end_time - start_time) * 1000.0

        content = message.content if isinstance(message.content, str) else ''.join(str(part) for part in message.content)
        
        # Token telemetry extraction from LangChain Ollama metadata
        response_meta = getattr(message, 'response_metadata', {})
        usage_meta = getattr(message, 'usage_metadata', {}) or {}
        
        prompt_tokens = usage_meta.get('input_tokens') or response_meta.get('prompt_eval_count') or (len(prompt) // 4)
        completion_tokens = usage_meta.get('output_tokens') or response_meta.get('eval_count') or (len(content) // 4)
        
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

        proposal = self.validator.validate(json.loads(content))
        return proposal, telemetry

    async def vision_fallback(self, goal: str, image_bytes: bytes) -> dict[str, Any]:
        """Fallback vision analysis using Ollama Vision Model (e.g. llava/llama3.2-vision)."""
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        prompt_text = VISION_PROMPT.replace('{goal}', goal)
        start_time = time.perf_counter()
        try:
            message = await self.vision_llm.ainvoke([
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
                'model': self.vision_model,
            }
        except Exception as exc:
            return {
                'vision_analysis': f'Ollama Vision fallback error: {exc}',
                'status': 'REQUEST_VISION_FAILED',
                'provider': self.provider_name,
            }
