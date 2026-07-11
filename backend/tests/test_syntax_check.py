"""Unit tests for syntax-only verification, including proof that learner code
is never executed."""

import os

from app import syntax_check


def test_valid_code_parses_and_extracts_facts():
    code = "import math\n\ndef area(r):\n    return math.pi * r ** 2\n"
    res = syntax_check.verify(code, starter="def area(r):\n    pass")
    assert res.valid is True
    assert res.passed is True
    names = [f.name for f in res.facts.functions]
    assert "area" in names
    assert "math" in res.facts.imports


def test_syntax_error_is_reported_not_raised():
    res = syntax_check.verify("def x(:\n  pass", starter="")
    assert res.valid is False
    assert res.error is not None
    assert res.error.lineno == 1
    assert res.passed is False


def test_trivial_stub_is_not_implemented():
    for body in ("pass", "...", '"""docstring only"""', "raise NotImplementedError"):
        code = f"def solve():\n    {body}"
        res = syntax_check.verify(code, starter="def solve():\n    pass")
        assert res.valid is True
        assert res.passed is False, f"stub body {body!r} should not count as implemented"


def test_implemented_function_passes():
    code = "def solve(n):\n    return n * 2"
    res = syntax_check.verify(code, starter="def solve(n):\n    pass")
    assert res.passed is True
    assert res.all_checks_passed is True


def test_unchanged_from_starter_does_not_pass():
    starter = "def solve(n):\n    return 0"
    res = syntax_check.verify(starter, starter=starter)
    assert res.valid is True
    assert res.changed is False
    assert res.passed is False


def test_explicit_requirements_must_use_and_must_not_import():
    req = syntax_check.Requirement(
        must_define=[("solve", 1)],
        must_use=["loop"],
        must_not_import=["numpy"],
    )
    good = "def solve(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total"
    res = syntax_check.verify(good, req=req)
    assert res.passed is True

    no_loop = "def solve(xs):\n    return sum(xs)"
    res2 = syntax_check.verify(no_loop, req=req)
    assert res2.passed is False
    assert any(c.label == "Uses a loop" and not c.passed for c in res2.checks)

    with_numpy = "import numpy\n\ndef solve(xs):\n    for x in xs:\n        pass\n    return 0"
    res3 = syntax_check.verify(with_numpy, req=req)
    assert any("numpy" in c.label and not c.passed for c in res3.checks)


def test_summary_never_claims_correctness():
    res = syntax_check.verify("def f(x):\n    return x", starter="def f(x):\n    pass")
    assert "NOT executed" in res.summary
    assert "does not imply correctness" in res.summary.lower()


def test_arg_count_requirement():
    req = syntax_check.Requirement(must_define=[("f", 2)])
    res = syntax_check.verify("def f(a):\n    return a", req=req)
    assert res.passed is False
    assert any("at least 2" in c.detail for c in res.checks)


def test_parse_does_not_execute_module_level_code(tmp_path):
    sentinel = tmp_path / "SENTINEL"
    assert not sentinel.exists()
    code = f"open({str(sentinel)!r}, 'w').write('boom')\n"
    res = syntax_check.verify(code, starter="")
    assert res.valid is True  # valid Python
    assert not sentinel.exists(), "ast.parse must not execute module-level code"


def test_derive_requirements_from_multiple_stubs():
    starter = "def a(x):\n    pass\n\ndef b(x, y):\n    pass\n"
    req = syntax_check.derive_requirements_from_starter(starter)
    names = {n for n, _ in req.must_define}
    assert names == {"a", "b"}


def test_oversized_submission_rejected_without_parsing():
    huge = "x = 1\n" * 20000  # > 50 KB
    res = syntax_check.verify(huge, starter="")
    assert res.valid is False
    assert "too large" in res.summary.lower()


def test_no_subprocess_or_exec_used(monkeypatch):
    # Guard against regressions that reintroduce execution in this module.
    import subprocess

    def boom(*a, **k):  # pragma: no cover
        raise AssertionError("syntax_check must not spawn a subprocess")

    monkeypatch.setattr(subprocess, "run", boom)
    monkeypatch.setattr(subprocess, "Popen", boom)
    monkeypatch.setattr(os, "system", boom)
    res = syntax_check.verify("def f():\n    return 1", starter="def f():\n    pass")
    assert res.passed is True
