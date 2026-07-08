"""Anthropic adapter: GET /v1/models and POST /v1/messages."""

from __future__ import annotations

import httpx

from .base import ChatMessage, LLMProvider, ProviderError, raise_for_provider_status

ANTHROPIC_VERSION = "2023-06-01"


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://api.anthropic.com"

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

    async def list_models(self) -> list[str]:
        try:
            async with self._client() as client:
                resp = await client.get(f"{self.base_url}/v1/models", headers=self._headers())
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach anthropic: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        models = [m.get("id", "") for m in data.get("data", []) if m.get("id")]
        if not models:
            raise ProviderError("provider_error", "anthropic returned an empty model list.")
        return models

    async def chat(
        self, model: str, messages: list[ChatMessage], max_tokens: int = 1024
    ) -> str:
        # Anthropic takes system as a top-level field, not a message role.
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        turns = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role in ("user", "assistant")
        ]
        payload: dict = {"model": model, "max_tokens": max_tokens, "messages": turns}
        if system:
            payload["system"] = system
        try:
            async with self._client() as client:
                resp = await client.post(
                    f"{self.base_url}/v1/messages", headers=self._headers(), json=payload
                )
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach anthropic: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        if data.get("stop_reason") == "refusal":
            raise ProviderError(
                "provider_error", "anthropic declined to answer this request."
            )
        parts = [
            b.get("text", "")
            for b in data.get("content", [])
            if isinstance(b, dict) and b.get("type") == "text"
        ]
        text = "".join(parts).strip()
        if not text:
            raise ProviderError("provider_error", "anthropic returned an empty completion.")
        return text
