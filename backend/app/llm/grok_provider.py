from __future__ import annotations

import os
from typing import Any

from ..schemas import ActionProposal, BrowserObservation, WorkflowDefinition, WorkflowStep
from .provider import LLMProvider


class GrokProvider(LLMProvider):
    """Minimal Grok-compatible provider stub for fallback extraction workflows."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or os.getenv('GROK_MODEL', 'grok-2')
        self.api_key = api_key or os.getenv('GROK_API_KEY')

    @property
    def provider_name(self) -> str:
        return 'grok'

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
        raise NotImplementedError('GrokProvider is intended for text fallback extraction, not browser decision-making yet.')

    async def vision_fallback(self, goal: str, image_bytes: bytes) -> dict[str, Any]:
        return {
            'vision_analysis': 'Grok vision fallback is not implemented for this project yet.',
            'status': 'REQUEST_VISION_FAILED',
            'provider': self.provider_name,
            'model': self.model,
        }
