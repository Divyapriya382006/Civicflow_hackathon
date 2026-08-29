from __future__ import annotations
import os
from .provider import LLMProvider
from .ollama_client import OllamaDecisionClient
from .gemini_provider import GeminiProvider
from .claude_provider import ClaudeProvider

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

def get_llm_provider(provider_type: str | None = None) -> LLMProvider:
    """
    Factory function returning the configured pluggable LLMProvider instance.
    Automatically uses Gemini API if GEMINI_API_KEY is present and valid,
    or respects explicit LLM_PROVIDER env var ('gemini' | 'claude' | 'ollama').
    """
    kind = provider_type or os.getenv('LLM_PROVIDER')
    if not kind:
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('API_KEY')
        if api_key and api_key != 'MY_GEMINI_API_KEY':
            kind = 'gemini'
        else:
            kind = 'ollama'
    
    kind = kind.lower()
    if kind == 'gemini':
        return GeminiProvider()
    elif kind == 'claude':
        return ClaudeProvider()
    elif kind == 'ollama':
        return OllamaDecisionClient()
    else:
        raise ValueError(f"Unsupported LLM provider '{kind}'. Choose from 'ollama', 'gemini', 'claude'.")
