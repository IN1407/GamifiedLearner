"""Ollama adapter (local, no API key).

Model list via native GET /api/tags (guaranteed on all Ollama versions);
chat via the OpenAI-compatible POST /v1/chat/completions endpoint.
"""

from __future__ import annotations

import httpx

from .base import ChatMessage, LLMProvider, ProviderError, raise_for_provider_status


class OllamaProvider(LLMProvider):
    name = "ollama"

    @classmethod
    def default_base_url(cls) -> str:
        return "http://localhost:11434"

    async def list_models(self) -> list[str]:
        try:
            async with self._client() as client:
                resp = await client.get(f"{self.base_url}/api/tags")
        except httpx.HTTPError:
            raise ProviderError(
                "network",
                "Could not reach Ollama. Is it running? Start it with `ollama serve` "
                f"(looked at {self.base_url}).",
            )
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
        if not models:
            raise ProviderError(
                "provider_error",
                "Ollama is running but has no models. Pull one first, e.g. `ollama pull llama3.2`.",
            )
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
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
                resp = await client.post(f"{self.base_url}/v1/chat/completions", json=payload)
        except httpx.HTTPError:
            raise ProviderError("network", "Lost connection to Ollama mid-request.")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise ProviderError("provider_error", "Ollama returned an unexpected response shape.")
        if not isinstance(content, str) or not content.strip():
            raise ProviderError("provider_error", "Ollama returned an empty completion.")
        return content
