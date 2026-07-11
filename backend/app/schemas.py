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
    # Static syntax/structure analysis passed to the grader as CONTEXTUAL
    # EVIDENCE ONLY. Learner code is never executed; this is not a correctness
    # verdict. (Field name kept generic on purpose.)
    code_evidence: str | None = None


class GradeResponse(BaseModel):
    score: int | None = None
    verdict: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    suggested_rewrite: str = ""
    unverified: list[str] = Field(default_factory=list)
    raw: str = ""  # fallback when the model didn't return valid JSON


class MustDefine(BaseModel):
    name: str
    min_args: int = 0


class VerifyRequirements(BaseModel):
    must_define: list[MustDefine] = Field(default_factory=list)
    must_use: list[str] = Field(default_factory=list)
    must_not_import: list[str] = Field(default_factory=list)


class VerifyRequest(BaseModel):
    """Request to statically verify learner Python. Code is NEVER executed."""

    code: str
    starter_code: str = ""
    # When omitted, requirements are derived from the starter's function stubs.
    requirements: VerifyRequirements | None = None


class SyntaxErrorOut(BaseModel):
    message: str
    lineno: int | None = None
    offset: int | None = None
    text: str | None = None


class VerifyCheckOut(BaseModel):
    label: str
    passed: bool
    detail: str = ""


class SyntaxFactsOut(BaseModel):
    functions: list[str] = Field(default_factory=list)
    classes: list[str] = Field(default_factory=list)
    imports: list[str] = Field(default_factory=list)
    constructs: list[str] = Field(default_factory=list)
    num_statements: int = 0


class VerifyResponse(BaseModel):
    valid: bool
    error: SyntaxErrorOut | None = None
    facts: SyntaxFactsOut = Field(default_factory=SyntaxFactsOut)
    checks: list[VerifyCheckOut] = Field(default_factory=list)
    all_checks_passed: bool = False
    changed: bool = False
    # passed == valid AND all structural checks pass AND changed from starter.
    # This is the deterministic completion signal; it is NOT a claim that the
    # code is semantically correct.
    passed: bool = False
    summary: str = ""


class ProviderInfo(BaseModel):
    id: str
    label: str
    needs_key: bool
    default_base_url: str
    key_hint: str = ""
