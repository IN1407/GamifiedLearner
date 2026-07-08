"""Tests for the FastAPI app: providers, demo AI, grade parsing, error mapping."""

import pytest
from fastapi.testclient import TestClient

from app.main import _parse_grade, app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"ok": True}


def test_list_providers_includes_all_ten_plus_demo():
    providers = client.get("/api/providers").json()
    ids = {p["id"] for p in providers}
    expected = {
        "openai", "anthropic", "google", "groq", "openrouter",
        "deepseek", "zhipu", "moonshot", "minimax", "ollama", "demo",
    }
    assert expected <= ids
    demo = next(p for p in providers if p["id"] == "demo")
    assert demo["needs_key"] is False


def test_validate_demo_no_key():
    r = client.post("/api/providers/validate", json={"provider": "demo"})
    assert r.status_code == 200
    assert r.json()["models"] == ["demo-tutor-1"]


def test_validate_missing_key_returns_401_typed_error():
    r = client.post("/api/providers/validate", json={"provider": "openai", "api_key": ""})
    assert r.status_code == 401
    body = r.json()
    assert body["error"]["type"] == "invalid_key"


def test_unknown_provider_400():
    r = client.post("/api/providers/validate", json={"provider": "nope"})
    assert r.status_code == 400
    assert r.json()["error"]["type"] == "bad_request"


def test_execute_endpoint():
    r = client.post(
        "/api/execute",
        json={
            "code": "def add(a, b):\n    return a + b",
            "tests": [{"name": "t", "code": "assert add(1, 2) == 3"}],
        },
    )
    body = r.json()
    assert body["all_passed"] is True
    assert body["results"][0]["passed"] is True


def test_demo_explain():
    r = client.post(
        "/api/ai/explain",
        json={
            "provider": "demo",
            "model": "demo-tutor-1",
            "question": "What is 2+2?",
            "choices": ["3", "4"],
            "user_answer": "3",
            "correct_answer": "4",
            "lesson_context": "arithmetic",
        },
    )
    assert r.status_code == 200
    assert "3" in r.json()["explanation"]


def test_demo_grade_returns_structured():
    r = client.post(
        "/api/ai/grade",
        json={
            "provider": "demo",
            "model": "demo-tutor-1",
            "task": "Write a prompt",
            "rubric": "clarity",
            "submission": "Write a haiku about the sea, with an example and a strict format and each step",
            "kind": "prompt",
        },
    )
    body = r.json()
    assert isinstance(body["score"], int)
    assert body["improvements"]


def test_grade_empty_submission_scores_zero():
    r = client.post(
        "/api/ai/grade",
        json={
            "provider": "demo",
            "model": "demo-tutor-1",
            "task": "t",
            "rubric": "r",
            "submission": "   ",
            "kind": "prompt",
        },
    )
    assert r.json()["score"] == 0


# ---- _parse_grade unit tests ----

def test_parse_grade_plain_json():
    g = _parse_grade('{"score": 85, "verdict": "good", "strengths": ["a"], "improvements": ["b"]}')
    assert g.score == 85 and g.verdict == "good" and g.strengths == ["a"]


def test_parse_grade_fenced_json():
    g = _parse_grade('```json\n{"score": 70, "improvements": ["x"]}\n```')
    assert g.score == 70 and g.improvements == ["x"]


def test_parse_grade_json_with_prose_wrapper():
    g = _parse_grade('Sure! Here is your grade:\n{"score": 60}\nHope that helps!')
    assert g.score == 60


def test_parse_grade_non_json_falls_back_to_raw():
    g = _parse_grade("This submission is pretty good overall.")
    assert g.score is None
    assert g.raw == "This submission is pretty good overall."


def test_parse_grade_float_score_coerced():
    g = _parse_grade('{"score": 82.0}')
    assert g.score == 82
