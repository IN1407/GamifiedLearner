"""Google Gemini adapter (Generative Language API).

GET  {base}/models?key=...            -> model list
POST {base}/models/{model}:generateContent?key=...
"""

from __future__ import annotations

import httpx

from .base import ChatMessage, LLMProvider, ProviderError, raise_for_provider_status


class GoogleProvider(LLMProvider):
    name = "google"

    @classmethod
    def default_base_url(cls) -> str:
        return "https://generativelanguage.googleapis.com/v1beta"

    async def list_models(self) -> list[str]:
        try:
            async with self._client() as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    params={"key": self.api_key, "pageSize": 200},
                )
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach google: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        models = []
        for m in data.get("models", []):
            methods = m.get("supportedGenerationMethods", [])
            if "generateContent" in methods:
                # names come back as "models/gemini-..."; strip the prefix
                models.append(m.get("name", "").removeprefix("models/"))
        models = [m for m in models if m]
        if not models:
            raise ProviderError("provider_error", "google returned no usable models.")
        return sorted(models)

    async def chat(
        self, model: str, messages: list[ChatMessage], max_tokens: int = 1024
    ) -> str:
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        contents = [
            {
                "role": "user" if m.role == "user" else "model",
                "parts": [{"text": m.content}],
            }
            for m in messages
            if m.role in ("user", "assistant")
        ]
        payload: dict = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        try:
            async with self._client() as client:
                resp = await client.post(
                    f"{self.base_url}/models/{model}:generateContent",
                    params={"key": self.api_key},
                    json=payload,
                )
        except httpx.HTTPError as e:
            raise ProviderError("network", f"Could not reach google: {type(e).__name__}")
        raise_for_provider_status(resp, self.name)
        data = resp.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
        except (KeyError, IndexError, TypeError):
            raise ProviderError("provider_error", "google returned an unexpected response shape.")
        if not text:
            raise ProviderError("provider_error", "google returned an empty completion.")
        return text
