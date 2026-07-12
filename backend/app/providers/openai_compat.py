"""Generic adapter for OpenAI-wire-compatible providers.

Covers OpenAI, Groq, OpenRouter, DeepSeek, Zhipu (bigmodel.cn), Moonshot
(Kimi), and MiniMax — each is a subclass that only sets a name and base URL.

Endpoints: GET {base}/models, POST {base}/chat/completions.
"""

from __future__ import annotations

import httpx

from .base import ChatMessage, LLMProvider, ProviderError, raise_for_provider_status


class OpenAICompatProvider(LLMProvider):
    name = "openai"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.openai.com/v1"

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def list_models(self) -> list[str]:
        try:
            async with self._client() as client:
                resp = await client.get(f"{self.base_url}/models", headers=self._headers())
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach {self.name}: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        models = [m.get("id", "") for m in data.get("data", []) if m.get("id")]
        if not models:
            raise ProviderError("provider_error", f"{self.name} returned an empty model list.")
        return sorted(models)

    async def chat(
        self, model: str, messages: list[ChatMessage], max_tokens: int = 1024
    ) -> str:
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_tokens,
        }
        try:
            async with self._client() as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach {self.name}: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise ProviderError("provider_error", f"{self.name} returned an unexpected response shape.")
        if not isinstance(content, str) or not content.strip():
            raise ProviderError("provider_error", f"{self.name} returned an empty completion.")
        return content


class GroqProvider(OpenAICompatProvider):
    name = "groq"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.groq.com/openai/v1"


class OpenRouterProvider(OpenAICompatProvider):
    name = "openrouter"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://openrouter.ai/api/v1"


class DeepSeekProvider(OpenAICompatProvider):
    name = "deepseek"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.deepseek.com/v1"


class ZhipuProvider(OpenAICompatProvider):
    """Zhipu / Z.ai. Mainland endpoint by default; international users can
    override base_url to https://api.z.ai/api/paas/v4 in the connect form."""

    name = "zhipu"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://open.bigmodel.cn/api/paas/v4"


class MoonshotProvider(OpenAICompatProvider):
    name = "moonshot"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.moonshot.ai/v1"


class MiniMaxProvider(OpenAICompatProvider):
    name = "minimax"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.minimax.io/v1"


class LlamaCppProvider(OpenAICompatProvider):
    """Local llama.cpp via its OpenAI-compatible server (keyless).

    Run a model with `python -m llama_cpp.server --model your-model.gguf`
    (from `pip install "llama-cpp-python[server]"`), which serves the OpenAI
    wire protocol on http://localhost:8080/v1 — so it reuses this adapter
    entirely. No API key, no per-token cost, fully offline. We prefer server
    mode over loading the model in-process because in-process loading would
    block the request worker; the server runs the model in its own process.
    """

    name = "llamacpp"

    @classmethod
    def default_base_url(cls) -> str:
        return "http://localhost:8080/v1"

    def _headers(self) -> dict[str, str]:
        # Keyless local server — send auth only if the user set one.
        return {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    async def list_models(self) -> list[str]:
        try:
            return await super().list_models()
        except ProviderError as e:
            if e.error_type == "network":
                raise ProviderError(
                    "network",
                    "Could not reach a llama.cpp server. Start one with "
                    '`python -m llama_cpp.server --model your-model.gguf` '
                    f"(looked at {self.base_url}).",
                )
            raise
