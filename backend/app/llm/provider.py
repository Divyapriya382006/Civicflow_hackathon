from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any
from ..schemas import ActionProposal, BrowserObservation, WorkflowDefinition, WorkflowStep

class LLMProvider(ABC):
    """Pluggable LLM Provider Interface for LangGraph Browser Agent."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'ollama', 'gemini', 'claude')."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the configured model."""
        ...

    @abstractmethod
    async def decide(
        self,
        workflow: WorkflowDefinition,
        step: WorkflowStep,
        observation: BrowserObservation,
        history: list[dict[str, Any]],
    ) -> tuple[ActionProposal, dict[str, Any]]:
        """
        Generates a structured action proposal and returns (ActionProposal, telemetry_metrics).
        telemetry_metrics dict:
            prompt_tokens: int
            completion_tokens: int
            inference_ms: float
            tokens_per_sec: float
            model: str
            provider: str
        """
        ...

    @abstractmethod
    async def vision_fallback(self, goal: str, image_bytes: bytes) -> dict[str, Any]:
        """
        Multimodal visual reasoning fallback for screenshot analysis.
        """
        ...
