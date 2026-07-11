"""Author-solution runner — INTERNAL / CI USE ONLY.

IMPORTANT: This module executes Python and MUST NEVER receive learner-submitted
code. It is not imported by the API (`app.main`) and is not reachable from any
HTTP endpoint. Its sole remaining purpose is the CI safety net in
`tests/test_exercise_solutions.py`, which runs the *authors'* reference
solutions against each exercise's tests to prove the exercises are solvable.

Learner code is verified statically and never executed — see
`app.syntax_check` and the `/api/verify` endpoint.

It executes reference Python against per-exercise test snippets in a subprocess:
python -I (isolated mode), temp working dir, wall-clock timeout, and (POSIX)
CPU/memory rlimits.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass

SENTINEL = "__GAMIFIEDLEARNER_RESULTS__"
DEFAULT_TIMEOUT_S = 8
MAX_OUTPUT_CHARS = 20_000

_HARNESS = r'''
import json, sys, traceback

SENTINEL = {sentinel!r}
payload = json.loads(sys.stdin.read())
user_code = payload["code"]
tests = payload["tests"]

results = []
ns = {{"__name__": "__main__"}}
setup_error = None
try:
    exec(compile(user_code, "<your code>", "exec"), ns)
except Exception:
    setup_error = traceback.format_exc(limit=3)

for t in tests:
    if setup_error is not None:
        results.append({{"name": t["name"], "passed": False,
                         "error": "Your code failed to run:\n" + setup_error}})
        continue
    try:
        exec(compile(t["code"], "<test: " + t["name"] + ">", "exec"), dict(ns))
        results.append({{"name": t["name"], "passed": True, "error": None}})
    except AssertionError as e:
        results.append({{"name": t["name"], "passed": False,
                         "error": "Assertion failed: " + (str(e) or "expected value did not match")}})
    except Exception:
        results.append({{"name": t["name"], "passed": False,
                         "error": traceback.format_exc(limit=2)}})

print()
print(SENTINEL + json.dumps(results))
'''.format(sentinel=SENTINEL)


@dataclass
class TestResult:
    name: str
    passed: bool
    error: str | None


@dataclass
class RunResult:
    ok: bool  # runner-level success (not "all tests passed")
    stdout: str
    results: list[TestResult]
    all_passed: bool
    error: str | None  # runner-level error (timeout etc.)

    def to_dict(self) -> dict:
        return asdict(self)


def _preexec():  # pragma: no cover - runs in the child process
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (DEFAULT_TIMEOUT_S, DEFAULT_TIMEOUT_S + 2))
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024,) * 2)


def run_exercise(code: str, tests: list[dict], timeout_s: int = DEFAULT_TIMEOUT_S) -> RunResult:
    if not code.strip():
        return RunResult(False, "", [], False, "Submission is empty — write some code first.")
    if len(code) > 50_000:
        return RunResult(False, "", [], False, "Submission too large (50 KB limit).")

    payload = json.dumps({"code": code, "tests": tests})
    kwargs: dict = {}
    if sys.platform != "win32":
        kwargs["preexec_fn"] = _preexec
    with tempfile.TemporaryDirectory() as workdir:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-c", _HARNESS],
                input=payload,
                capture_output=True,
                text=True,
                timeout=timeout_s,
                cwd=workdir,
                **kwargs,
            )
        except subprocess.TimeoutExpired:
            return RunResult(
                False, "", [], False,
                f"Your code took longer than {timeout_s}s — check for an infinite loop.",
            )

    out = proc.stdout or ""
    sentinel_pos = out.rfind(SENTINEL)
    if sentinel_pos == -1:
        stderr_tail = (proc.stderr or "")[-2000:]
        return RunResult(
            False,
            out[:MAX_OUTPUT_CHARS],
            [],
            False,
            "The runner crashed before producing results."
            + (f"\n{stderr_tail}" if stderr_tail else ""),
        )

    display_stdout = out[:sentinel_pos].rstrip()[:MAX_OUTPUT_CHARS]
    try:
        raw = json.loads(out[sentinel_pos + len(SENTINEL):].strip())
    except json.JSONDecodeError:
        return RunResult(False, display_stdout, [], False, "Could not parse test results.")

    results = [TestResult(r["name"], bool(r["passed"]), r.get("error")) for r in raw]
    all_passed = bool(results) and all(r.passed for r in results)
    return RunResult(True, display_stdout, results, all_passed, None)
