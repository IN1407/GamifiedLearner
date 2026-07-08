"""Provider adapter interface.

Every vendor gets one adapter implementing LLMProvider. Adding a provider
later means adding a single file and registering it in providers/__init__.py.

Deliberate deviation from "use each provider's official SDK": all adapters
speak raw HTTP via httpx. Ten vendor SDKs would mean ten dependency trees,
ten error taxonomies, and ten retry behaviors to reconcile; a thin HTTP
adapter per vendor keeps error handling uniform and the surface small.
Most vendors here are OpenAI-wire-compatible anyway.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx


class ProviderError(Exception):
    """Structured provider failure surfaced to the frontend as a typed error.

    error_type is one of: invalid_key, rate_limited, network, provider_error,
    bad_request, not_found.
    """

    def __init__(self, error_type: str, message: str, status: int | None = None):
        super().__init__(message)
        self.error_type = error_type
        self.message = message
        self.status = status


def raise_for_provider_status(resp: httpx.Response, provider: str) -> None:
    if resp.status_code < 400:
        return
    # Never include request bodies (which may embed keys) in error text.
    detail = ""
    try:
        body = resp.json()
        if isinstance(body, dict):
            err = body.get("error", body)
            if isinstance(err, dict):
                detail = str(err.get("message") or err.get("msg") or "")[:300]
            else:
                detail = str(err)[:300]
    except Exception:
        detail = resp.text[:200]
    if resp.status_code in (401, 403):
        raise ProviderError(
            "invalid_key",
            f"{provider} rejected the API key ({resp.status_code}). {detail}".strip(),
            resp.status_code,
        )
    if resp.status_code == 429:
        raise ProviderError(
            "rate_limited",
            f"{provider} rate limit hit. Wait a moment and retry. {detail}".strip(),
            429,
        )
    if resp.status_code == 404:
        raise ProviderError(
            "not_found",
            f"{provider} endpoint or model not found. {detail}".strip(),
            404,
        )
    if 400 <= resp.status_code < 500:
        raise ProviderError(
            "bad_request", f"{provider} rejected the request: {detail}", resp.status_code
        )
    raise ProviderError(
        "provider_error",
        f"{provider} server error ({resp.status_code}). Try again shortly. {detail}".strip(),
        resp.status_code,
    )


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMProvider(ABC):
    """One instance per request; holds the caller's key only for its lifetime."""

    name: str = "base"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or ""
        self.base_url = (base_url or self.default_base_url()).rstrip("/")

    @classmethod
    @abstractmethod
    def default_base_url(cls) -> str: ...

    @abstractmethod
    async def list_models(self) -> list[str]:
        """Return live model ids for this key. Raises ProviderError."""

    @abstractmethod
    async def chat(
        self, model: str, messages: list[ChatMessage], max_tokens: int = 1024
    ) -> str:
        """Single non-streaming completion. Returns assistant text."""

    async def validate_key(self) -> list[str]:
        """Key validation == a successful live model list."""
        return await self.list_models()

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
