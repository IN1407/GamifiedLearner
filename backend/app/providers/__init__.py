"""Provider registry. Adding a vendor = one new adapter file + one line here."""

from __future__ import annotations

from .anthropic_provider import AnthropicProvider
from .base import ChatMessage, LLMProvider, ProviderError
from .demo_provider import DemoProvider
from .google_provider import GoogleProvider
from .ollama_provider import OllamaProvider
from .openai_compat import (
    DeepSeekProvider,
    GroqProvider,
    LlamaCppProvider,
    MetaLlamaProvider,
    MiniMaxProvider,
    MoonshotProvider,
    OpenAICompatProvider,
    OpenRouterProvider,
    QwenProvider,
    SarvamProvider,
    XaiProvider,
    ZhipuProvider,
)

PROVIDERS: dict[str, type[LLMProvider]] = {
    "openai": OpenAICompatProvider,
    "anthropic": AnthropicProvider,
    "google": GoogleProvider,
    "groq": GroqProvider,
    "openrouter": OpenRouterProvider,
    "deepseek": DeepSeekProvider,
    "zhipu": ZhipuProvider,
    "moonshot": MoonshotProvider,
    "minimax": MiniMaxProvider,
    "qwen": QwenProvider,
    "xai": XaiProvider,
    "meta": MetaLlamaProvider,
    "sarvam": SarvamProvider,
    "ollama": OllamaProvider,
    "llamacpp": LlamaCppProvider,
    "demo": DemoProvider,
}

# Providers that work with no API key (local, offline).
KEYLESS = {"ollama", "llamacpp", "demo"}


def get_provider(name: str, api_key: str | None, base_url: str | None) -> LLMProvider:
    cls = PROVIDERS.get(name)
    if cls is None:
        raise ProviderError("bad_request", f"Unknown provider '{name}'.")
    if name not in KEYLESS and not (api_key or "").strip():
        raise ProviderError("invalid_key", f"{name} requires an API key.")
    return cls(api_key=api_key, base_url=base_url)


__all__ = [
    "PROVIDERS",
    "KEYLESS",
    "get_provider",
    "LLMProvider",
    "ChatMessage",
    "ProviderError",
]
