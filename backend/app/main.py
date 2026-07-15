"""GamifiedLearner backend.

Stateless AI proxy + deterministic code runner. API keys are never stored or
logged here: the browser holds them (encrypted in IndexedDB), decrypts
client-side, and sends them per-request over HTTPS. Tradeoff vs a server-side
session: no key ever persists outside the user's browser and a backend restart
loses nothing, at the cost of the key riding along on each AI request.
"""

from __future__ import annotations

import json
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import prompts, schemas, syntax_check
from .providers import KEYLESS, PROVIDERS, ChatMessage, ProviderError, get_provider

app = FastAPI(title="GamifiedLearner API", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STATUS_BY_TYPE = {
    "invalid_key": 401,
    "rate_limited": 429,
    "not_found": 404,
    "bad_request": 400,
    "network": 502,
    "provider_error": 502,
}

PROVIDER_LABELS = {
    "openai": ("OpenAI", "sk-..."),
    "anthropic": ("Anthropic", "sk-ant-..."),
    "google": ("Google (Gemini)", "AIza..."),
    "groq": ("Groq", "gsk_..."),
    "openrouter": ("OpenRouter", "sk-or-..."),
    "deepseek": ("DeepSeek", "sk-..."),
    "zhipu": ("Zhipu / Z.ai", ""),
    "moonshot": ("Moonshot (Kimi)", "sk-..."),
    "minimax": ("MiniMax", ""),
    "qwen": ("Alibaba Qwen", "sk-..."),
    "xai": ("xAI (Grok)", "xai-..."),
    "meta": ("Meta Llama", "LLM|..."),
    "sarvam": ("Sarvam AI", "sk_..."),
    "ollama": ("Ollama (local)", ""),
    "llamacpp": ("llama.cpp (local)", ""),
    "demo": ("Demo mode (no key)", ""),
}


@app.exception_handler(ProviderError)
async def provider_error_handler(_: Request, exc: ProviderError):
    return JSONResponse(
        status_code=_STATUS_BY_TYPE.get(exc.error_type, 502),
        content={"error": {"type": exc.error_type, "message": exc.message}},
    )


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/providers", response_model=list[schemas.ProviderInfo])
async def list_providers():
    out = []
    for pid, cls in PROVIDERS.items():
        label, hint = PROVIDER_LABELS.get(pid, (pid, ""))
        out.append(
            schemas.ProviderInfo(
                id=pid,
                label=label,
                needs_key=pid not in KEYLESS,
                default_base_url=cls.default_base_url(),
                key_hint=hint,
            )
        )
    return out


@app.post("/api/providers/validate", response_model=schemas.ValidateResponse)
async def validate(req: schemas.ValidateRequest):
    provider = get_provider(req.provider, req.api_key, req.base_url)
    models = await provider.validate_key()
    return schemas.ValidateResponse(ok=True, models=models)


@app.post("/api/ai/explain", response_model=schemas.ExplainResponse)
async def ai_explain(req: schemas.ExplainRequest):
    provider = get_provider(req.provider, req.api_key, req.base_url)
    messages = [
        ChatMessage("system", prompts.EXPLAIN_SYSTEM_PROMPT),
        ChatMessage(
            "user",
            prompts.build_explain_user_message(
                req.question, req.choices, req.user_answer, req.correct_answer,
                req.lesson_context[:8000],
            ),
        ),
    ]
    text = await provider.chat(req.model, messages, max_tokens=1024)
    return schemas.ExplainResponse(explanation=text)


@app.post("/api/ai/revise", response_model=schemas.ReviseResponse)
async def ai_revise(req: schemas.ReviseRequest):
    provider = get_provider(req.provider, req.api_key, req.base_url)
    messages = [
        ChatMessage("system", prompts.REVISE_SYSTEM_PROMPT),
        ChatMessage(
            "user",
            prompts.build_revise_user_message(
                req.original[:8000], req.instruction[:1000], req.lesson_context[:8000]
            ),
        ),
    ]
    text = await provider.chat(req.model, messages, max_tokens=1024)
    return schemas.ReviseResponse(explanation=text)


@app.post("/api/ai/chat", response_model=schemas.ChatResponse)
async def ai_chat(req: schemas.ChatRequest):
    provider = get_provider(req.provider, req.api_key, req.base_url)
    messages = [ChatMessage("system", prompts.CHAT_SYSTEM_PROMPT)]
    for turn in req.history[-8:]:
        if turn.role in ("user", "assistant"):
            messages.append(ChatMessage(turn.role, turn.content[:4000]))
    messages.append(
        ChatMessage("user", prompts.build_chat_user_message(req.question, req.lesson_context[:8000]))
    )
    text = await provider.chat(req.model, messages, max_tokens=1024)
    return schemas.ChatResponse(answer=text)


_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _parse_grade(text: str) -> schemas.GradeResponse:
    cleaned = _FENCE_RE.sub("", text.strip()).strip()
    # Models sometimes wrap the JSON in prose; grab the outermost object.
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            data = json.loads(cleaned[start : end + 1])
            score = data.get("score")
            return schemas.GradeResponse(
                score=int(score) if isinstance(score, (int, float)) else None,
                verdict=str(data.get("verdict", "")),
                strengths=[str(s) for s in data.get("strengths", []) if s],
                improvements=[str(s) for s in data.get("improvements", []) if s],
                suggested_rewrite=str(data.get("suggested_rewrite", "")),
                unverified=[str(s) for s in data.get("unverified", []) if s],
                raw="",
            )
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return schemas.GradeResponse(raw=text)


@app.post("/api/ai/grade", response_model=schemas.GradeResponse)
async def ai_grade(req: schemas.GradeRequest):
    if not req.submission.strip():
        return schemas.GradeResponse(
            score=0,
            verdict="Empty submission.",
            improvements=["Write your answer in the box before submitting."],
        )
    provider = get_provider(req.provider, req.api_key, req.base_url)
    messages = [
        ChatMessage("system", prompts.GRADER_SYSTEM_PROMPT),
        ChatMessage(
            "user",
            prompts.build_grade_user_message(
                req.task[:4000], req.rubric[:4000], req.submission[:12000],
                req.kind, req.code_evidence,
            ),
        ),
    ]
    text = await provider.chat(req.model, messages, max_tokens=1500)
    return _parse_grade(text)


@app.post("/api/verify", response_model=schemas.VerifyResponse)
async def verify(req: schemas.VerifyRequest):
    """Statically verify learner Python. Learner code is NEVER executed — the
    submission is only parsed into an AST and inspected (see syntax_check.py)."""
    requirement = None
    if req.requirements is not None:
        requirement = syntax_check.Requirement(
            must_define=[(m.name, m.min_args) for m in req.requirements.must_define],
            must_use=list(req.requirements.must_use),
            must_not_import=list(req.requirements.must_not_import),
        )
    result = syntax_check.verify(req.code, req.starter_code, requirement)
    return schemas.VerifyResponse(
        valid=result.valid,
        error=schemas.SyntaxErrorOut(**vars(result.error)) if result.error else None,
        facts=schemas.SyntaxFactsOut(
            functions=[f.name for f in result.facts.functions],
            classes=result.facts.classes,
            imports=result.facts.imports,
            constructs=result.facts.constructs,
            num_statements=result.facts.num_statements,
        ),
        checks=[schemas.VerifyCheckOut(label=c.label, passed=c.passed, detail=c.detail) for c in result.checks],
        all_checks_passed=result.all_checks_passed,
        changed=result.changed,
        passed=result.passed,
        summary=result.summary,
    )
