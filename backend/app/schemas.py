from __future__ import annotations

from pydantic import BaseModel, Field


class ProviderAuth(BaseModel):
    provider: str
    api_key: str | None = None
    base_url: str | None = None


class ValidateRequest(ProviderAuth):
    pass


class ValidateResponse(BaseModel):
    ok: bool
    models: list[str]


class ExplainRequest(ProviderAuth):
    model: str
    question: str
    choices: list[str] = Field(default_factory=list)
    user_answer: str
    correct_answer: str
    lesson_context: str = ""


class ExplainResponse(BaseModel):
    explanation: str


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(ProviderAuth):
    model: str
    question: str
    lesson_context: str = ""
    history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str


class GradeRequest(ProviderAuth):
    model: str
    task: str
    rubric: str
    submission: str
    kind: str = "prompt"  # "prompt" | "code"
    execution_results: str | None = None


class GradeResponse(BaseModel):
    score: int | None = None
    verdict: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    suggested_rewrite: str = ""
    unverified: list[str] = Field(default_factory=list)
    raw: str = ""  # fallback when the model didn't return valid JSON


class TestCase(BaseModel):
    name: str
    code: str


class ExecuteRequest(BaseModel):
    code: str
    tests: list[TestCase]


class TestResultOut(BaseModel):
    name: str
    passed: bool
    error: str | None = None


class ExecuteResponse(BaseModel):
    ok: bool
    stdout: str
    results: list[TestResultOut]
    all_passed: bool
    error: str | None = None


class ProviderInfo(BaseModel):
    id: str
    label: str
    needs_key: bool
    default_base_url: str
    key_hint: str = ""
