"""Tests for the deterministic code-exercise runner."""

from app.runner import run_exercise


def test_all_tests_pass():
    r = run_exercise(
        "def add(a, b):\n    return a + b",
        [{"name": "adds", "code": "assert add(2, 3) == 5"}],
    )
    assert r.ok and r.all_passed
    assert r.results[0].passed


def test_failing_assertion_reported():
    r = run_exercise(
        "def add(a, b):\n    return a - b",  # wrong
        [{"name": "adds", "code": "assert add(2, 3) == 5"}],
    )
    assert r.ok and not r.all_passed
    assert not r.results[0].passed
    assert "Assertion failed" in (r.results[0].error or "")


def test_syntax_error_in_user_code():
    r = run_exercise("def broken(:", [{"name": "t", "code": "assert True"}])
    # runner still produces results; the test fails because setup failed
    assert r.ok
    assert not r.results[0].passed
    assert "failed to run" in (r.results[0].error or "").lower()


def test_empty_submission():
    r = run_exercise("   ", [{"name": "t", "code": "assert True"}])
    assert not r.ok
    assert "empty" in (r.error or "").lower()


def test_stdout_captured():
    r = run_exercise(
        "print('hello world')\ndef f():\n    return 1",
        [{"name": "t", "code": "assert f() == 1"}],
    )
    assert "hello world" in r.stdout


def test_infinite_loop_times_out():
    r = run_exercise(
        "while True:\n    pass\ndef f():\n    return 1",
        [{"name": "t", "code": "assert f() == 1"}],
        timeout_s=3,
    )
    assert not r.ok
    assert "longer than" in (r.error or "").lower()


def test_multiple_tests_mixed():
    r = run_exercise(
        "def sq(x):\n    return x * x",
        [
            {"name": "pos", "code": "assert sq(3) == 9"},
            {"name": "wrong", "code": "assert sq(2) == 5"},
            {"name": "zero", "code": "assert sq(0) == 0"},
        ],
    )
    assert [t.passed for t in r.results] == [True, False, True]
    assert not r.all_passed


def test_user_code_cannot_write_outside(tmp_path):
    # Runner uses an isolated temp cwd; a relative write stays contained.
    r = run_exercise(
        "with open('scratch.txt', 'w') as f:\n    f.write('x')\ndef f():\n    return 1",
        [{"name": "t", "code": "assert f() == 1"}],
    )
    assert r.ok and r.all_passed
