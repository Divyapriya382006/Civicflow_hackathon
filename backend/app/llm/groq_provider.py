from __future__ import annotations

import ast
import asyncio
import base64
import json
import os
import re
import time
from typing import Any

import httpx

from ..schemas import ActionProposal, BrowserObservation, WorkflowDefinition, WorkflowStep
from .decision_schema import DecisionValidator
from .prompts import SYSTEM_PROMPT, VISION_PROMPT, decision_prompt
from .provider import LLMProvider


class GroqProvider(LLMProvider):
    """OpenAI-compatible Groq provider for fast browser-decisions and vision fallback."""

    @staticmethod
    def _extract_retry_after_seconds(error_text: str) -> float | None:
        if not error_text:
            return None

        search_text = str(error_text).strip()
        candidates = [search_text]

        for candidate in (search_text, search_text.replace("'", '"')):
            try:
                parsed = json.loads(candidate)
            except (TypeError, ValueError):
                try:
                    parsed = ast.literal_eval(candidate)
                except (TypeError, ValueError, SyntaxError):
                    continue
            if isinstance(parsed, dict):
                message = parsed.get('error', {}).get('message') or parsed.get('message')
                if isinstance(message, str):
                    candidates.append(message)
                candidates.append(str(parsed))

        for candidate in candidates:
            match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*s', candidate, flags=re.I)
            if match:
                return float(match.group(1)) + 0.5
        return None

    def __init__(self, model: str | None = None, api_key: str | None = None, base_url: str | None = None):
        self.model = model or os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
        self.api_key = api_key or os.getenv('GROQ_API_KEY')
        self.base_url = base_url or os.getenv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
        self.validator = DecisionValidator()

    @property
    def provider_name(self) -> str:
        return 'groq'

    @property
    def model_name(self) -> str:
        return self.model

    async def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError('GROQ_API_KEY environment variable is not configured.')

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }
        url = f'{self.base_url.rstrip("/")}/chat/completions'

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code == 429:
                        body_text = response.text
                        retry_after = self._extract_retry_after_seconds(body_text)
                        if retry_after is not None and attempt < 2:
                            await asyncio.sleep(retry_after)
                            continue
                        raise httpx.HTTPStatusError(
                            f'HTTP 429: {body_text}', request=response.request, response=response
                        )
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as exc:
                status = getattr(exc.response, 'status_code', 'unknown')
                body = getattr(exc.response, 'text', '<no-response-body>')
                if status == 429 and attempt < 2:
                    wait_for = self._extract_retry_after_seconds(body) or 2.0
                    await asyncio.sleep(wait_for)
                    continue
                raise RuntimeError(
                    f"Groq API request failed: method=POST url={url} model={payload.get('model')} "
                    f"status={status} body={body}"
                ) from exc
        raise RuntimeError(f"Groq API request failed after retries: url={url} model={payload.get('model')}")

    async def decide(
        self,
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        observation: BrowserObservation,
        history: list[dict[str, Any]],
        workflow_values: dict[str, str] | None = None,
    ) -> tuple[ActionProposal, dict[str, Any]]:
        prompt = decision_prompt(
            workflow,
            step,
            observation,
            history,
            workflow.constraints.get('allowed_actions', []),
            workflow_values,
        )

        start = time.perf_counter()
        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0,
            'response_format': {'type': 'json_object'},
            'max_tokens': 800,
        }

        data = await self._request(payload)
        end = time.perf_counter()
        content = data['choices'][0]['message']['content']
        usage = data.get('usage', {})

        inference_ms = (end - start) * 1000.0
        prompt_tokens = usage.get('prompt_tokens', len(prompt) // 4)
        completion_tokens = usage.get('completion_tokens', max(len(str(content)) // 4, 1))
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
        try:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            prompt_text = VISION_PROMPT.replace('{goal}', goal)
            start = time.perf_counter()
            payload = {
                'model': self.model,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt_text},
                            {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{base64_image}'}} ,
                        ],
                    }
                ],
                'max_tokens': 500,
                'temperature': 0,
            }
            data = await self._request(payload)
            end = time.perf_counter()
            text = data['choices'][0]['message']['content']
            return {
                'vision_analysis': text,
                'status': 'REQUEST_VISION_SUCCESS',
                'inference_ms': round((end - start) * 1000.0, 2),
                'provider': self.provider_name,
                'model': self.model,
            }
        except Exception as exc:
            return {
                'vision_analysis': f'Groq vision fallback error: {exc}',
                'status': 'REQUEST_VISION_FAILED',
                'provider': self.provider_name,
                'model': self.model,
            }
