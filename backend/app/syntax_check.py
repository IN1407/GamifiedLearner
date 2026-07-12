"""Syntax-only verification of learner Python.

CRITICAL SAFETY CONTRACT: learner-submitted code is NEVER executed here — not
via exec/eval, not by compiling-and-calling, not in a subprocess. We only parse
the source into an AST (`ast.parse`) and inspect it statically. `ast.parse`
builds a tree; it does not run module-level code, import anything, or evaluate
any expression.

Syntax verification is only a supporting signal. It must never be treated as
the primary measure of code quality or correctness. Syntactically valid Python
can still be logically incorrect, inefficient, insecure, irrelevant to the
exercise, or otherwise poor-quality code. Structural checks (below) add a
little more substance — "did the learner actually implement the required
function?" — but semantic correctness is judged separately by the AI grader,
which receives these results only as contextual evidence.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field

MAX_SOURCE_CHARS = 50_000

# Which AST call maps to which "construct" label for `must_use` checks.
_CONSTRUCTS = {
    "loop": (ast.For, ast.AsyncFor, ast.While),
    "comprehension": (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp),
    "conditional": (ast.If, ast.IfExp),
    "try": (ast.Try,),
    "with": (ast.With, ast.AsyncWith),
    "return": (ast.Return,),
}


@dataclass
class FunctionFact:
    name: str
    args: int
    trivial: bool  # body is only pass / ... / docstring / raise NotImplementedError


@dataclass
class SyntaxFacts:
    functions: list[FunctionFact] = field(default_factory=list)
    classes: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    constructs: list[str] = field(default_factory=list)  # subset of _CONSTRUCTS keys present
    calls: list[str] = field(default_factory=list)
    num_statements: int = 0

    def function(self, name: str) -> FunctionFact | None:
        for f in self.functions:
            if f.name == name:
                return f
        return None


@dataclass
class SyntaxErrorInfo:
    message: str
    lineno: int | None
    offset: int | None
    text: str | None


def _is_trivial_body(body: list[ast.stmt]) -> bool:
    """True when a function body has no real implementation."""
    real = []
    for i, node in enumerate(body):
        # A leading string literal is a docstring — ignore it.
        if (
            i == 0
            and isinstance(node, ast.Expr)
            and isinstance(node.value, ast.Constant)
            and isinstance(node.value.value, str)
        ):
            continue
        if isinstance(node, ast.Pass):
            continue
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and node.value.value is Ellipsis:
            continue
        if isinstance(node, ast.Raise):
            # `raise NotImplementedError(...)` stubs count as unimplemented.
            exc = node.exc
            name = None
            if isinstance(exc, ast.Name):
                name = exc.id
            elif isinstance(exc, ast.Call) and isinstance(exc.func, ast.Name):
                name = exc.func.id
            if name == "NotImplementedError":
                continue
        real.append(node)
    return len(real) == 0


def _arg_count(node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    a = node.args
    return len(a.posonlyargs) + len(a.args) + len(a.kwonlyargs)


def extract_facts(tree: ast.Module) -> SyntaxFacts:
    facts = SyntaxFacts(num_statements=len(tree.body))
    seen_constructs: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            facts.functions.append(
                FunctionFact(node.name, _arg_count(node), _is_trivial_body(node.body))
            )
        elif isinstance(node, ast.ClassDef):
            facts.classes.append(node.name)
        elif isinstance(node, ast.Import):
            facts.imports.extend(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                facts.imports.append(node.module.split(".")[0])
        elif isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name):
                facts.calls.append(fn.id)
            elif isinstance(fn, ast.Attribute):
                facts.calls.append(fn.attr)
        for label, types in _CONSTRUCTS.items():
            if isinstance(node, types):
                seen_constructs.add(label)
    facts.constructs = [k for k in _CONSTRUCTS if k in seen_constructs]
    facts.imports = sorted(set(facts.imports))
    facts.calls = sorted(set(facts.calls))
    return facts


def parse(code: str) -> tuple[ast.Module | None, SyntaxErrorInfo | None]:
    """Parse source into an AST WITHOUT executing it. Returns (tree, error)."""
    try:
        tree = ast.parse(code)
        return tree, None
    except SyntaxError as e:
        return None, SyntaxErrorInfo(
            message=e.msg or "invalid syntax",
            lineno=e.lineno,
            offset=e.offset,
            text=(e.text or "").rstrip("\n") or None,
        )
    except ValueError as e:
        # e.g. source with null bytes
        return None, SyntaxErrorInfo(message=str(e) or "invalid source", lineno=None, offset=None, text=None)


@dataclass
class Requirement:
    must_define: list[tuple[str, int]] = field(default_factory=list)  # (name, min_args)
    must_use: list[str] = field(default_factory=list)
    must_not_import: list[str] = field(default_factory=list)


@dataclass
class Check:
    label: str
    passed: bool
    detail: str = ""


def derive_requirements_from_starter(starter: str) -> Requirement:
    """When an exercise ships no explicit requirements, require the learner to
    implement the top-level functions the starter stubs out."""
    req = Requirement()
    tree, err = parse(starter or "")
    if tree is None:
        return req
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            req.must_define.append((node.name, _arg_count(node)))
    return req


def evaluate_checks(facts: SyntaxFacts, req: Requirement) -> list[Check]:
    checks: list[Check] = []
    for name, min_args in req.must_define:
        fn = facts.function(name)
        if fn is None:
            checks.append(Check(f"Defines {name}(…)", False, f"No function named `{name}` was found."))
        elif fn.trivial:
            checks.append(
                Check(f"Implements {name}(…)", False, f"`{name}` is defined but has no implementation yet.")
            )
        elif fn.args < min_args:
            checks.append(
                Check(
                    f"Defines {name}(…)",
                    False,
                    f"`{name}` should take at least {min_args} argument(s); found {fn.args}.",
                )
            )
        else:
            checks.append(Check(f"Implements {name}(…)", True))
    for construct in req.must_use:
        present = construct in facts.constructs
        checks.append(
            Check(
                f"Uses a {construct}",
                present,
                "" if present else f"Expected the solution to use a {construct}.",
            )
        )
    for mod in req.must_not_import:
        used = mod in facts.imports
        checks.append(
            Check(
                f"Avoids importing {mod}",
                not used,
                "" if not used else f"This exercise should be solved without importing `{mod}`.",
            )
        )
    return checks


@dataclass
class VerifyResult:
    valid: bool
    error: SyntaxErrorInfo | None
    facts: SyntaxFacts
    checks: list[Check]
    all_checks_passed: bool
    changed: bool
    passed: bool
    summary: str


def _summary(result_valid: bool, error: SyntaxErrorInfo | None, checks: list[Check], changed: bool) -> str:
    """A compact, human/AI-readable evidence string. Never asserts correctness."""
    lines: list[str] = []
    if not result_valid and error is not None:
        loc = f" (line {error.lineno})" if error.lineno else ""
        lines.append(f"SYNTAX: invalid — {error.message}{loc}.")
        lines.append("Note: code does not parse; it was NOT executed. This is not a correctness judgment.")
        return "\n".join(lines)
    lines.append("SYNTAX: valid (parsed only — NOT executed; validity does not imply correctness).")
    if not changed:
        lines.append("STRUCTURE: submission is unchanged from the starter code.")
    for c in checks:
        lines.append(f"CHECK[{'pass' if c.passed else 'fail'}]: {c.label}" + (f" — {c.detail}" if c.detail else ""))
    return "\n".join(lines)


def verify(code: str, starter: str = "", req: Requirement | None = None) -> VerifyResult:
    """Full syntax-only verification. No execution occurs anywhere in this call."""
    if len(code) > MAX_SOURCE_CHARS:
        err = SyntaxErrorInfo("Submission too large (50 KB limit).", None, None, None)
        return VerifyResult(False, err, SyntaxFacts(), [], False, False, False, err.message)

    tree, error = parse(code)
    if tree is None:
        summary = _summary(False, error, [], False)
        return VerifyResult(False, error, SyntaxFacts(), [], False, bool(code.strip()), False, summary)

    facts = extract_facts(tree)
    requirement = req if req is not None else derive_requirements_from_starter(starter)
    checks = evaluate_checks(facts, requirement)
    all_passed = all(c.passed for c in checks)
    changed = code.strip() != (starter or "").strip()
    passed = all_passed and changed
    summary = _summary(True, None, checks, changed)
    return VerifyResult(True, None, facts, checks, all_passed, changed, passed, summary)
