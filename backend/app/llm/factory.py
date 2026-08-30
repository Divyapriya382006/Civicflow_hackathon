from __future__ import annotations
import os
from .provider import LLMProvider
from .ollama_client import OllamaDecisionClient
from .gemini_provider import GeminiProvider
from .claude_provider import ClaudeProvider
from .groq_provider import GroqProvider

try:
    from dotenv import load_dotenv
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    load_dotenv(dotenv_path, override=True)
except Exception:
    pass


def get_llm_provider(provider_type: str | None = None) -> LLMProvider:
    """
    Factory function returning the configured pluggable LLMProvider instance.
    Prefers Gemini when GEMINI_API_KEY is present; otherwise falls back to Groq or Ollama.
    """
    kind = (provider_type or os.getenv('LLM_PROVIDER') or '').lower().strip()

    if not kind:
        gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('API_KEY')
        groq_key = os.getenv('GROQ_API_KEY')
        if gemini_key and gemini_key != 'MY_GEMINI_API_KEY':
            kind = 'gemini'
        elif groq_key and groq_key != 'MY_GROQ_API_KEY':
            kind = 'groq'
        else:
            kind = 'ollama'

    if kind == 'groq':
        return GroqProvider()
    if kind == 'gemini':
        return GeminiProvider()
    if kind == 'claude':
        return ClaudeProvider()
    if kind == 'ollama':
        return OllamaDecisionClient()

    raise ValueError(f"Unsupported LLM provider '{kind}'. Choose from 'ollama', 'gemini', 'claude', 'groq'.")
