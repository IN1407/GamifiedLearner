"""Tests for the FastAPI app: providers, demo AI, grade parsing, error mapping."""

import pytest
from fastapi.testclient import TestClient

from app.main import _parse_grade, app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"ok": True}


def test_list_providers_includes_all_hosted_plus_demo():
    providers = client.get("/api/providers").json()
    ids = {p["id"] for p in providers}
    expected = {
        "openai", "anthropic", "google", "groq", "openrouter",
        "deepseek", "zhipu", "moonshot", "minimax",
        "qwen", "xai", "meta", "sarvam", "ollama", "demo",
    }
    assert expected <= ids
    demo = next(p for p in providers if p["id"] == "demo")
    assert demo["needs_key"] is False


def test_new_hosted_providers_need_a_key_and_have_labels():
    providers = client.get("/api/providers").json()
    by_id = {p["id"]: p for p in providers}
    expected = {
        "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "xai": "https://api.x.ai/v1",
        "meta": "https://api.llama.com/compat/v1",
        "sarvam": "https://api.sarvam.ai/v1",
    }
    for pid, base in expected.items():
        assert pid in by_id, f"{pid} missing from provider list"
        assert by_id[pid]["needs_key"] is True
        assert by_id[pid]["default_base_url"] == base
        assert by_id[pid]["label"], f"{pid} has no display label"


def test_new_providers_construct_with_bearer_auth():
    from app.providers import get_provider
    from app.providers.openai_compat import (
        MetaLlamaProvider,
        QwenProvider,
        SarvamProvider,
        XaiProvider,
    )

    for pid, cls in [
        ("qwen", QwenProvider),
        ("xai", XaiProvider),
        ("meta", MetaLlamaProvider),
        ("sarvam", SarvamProvider),
    ]:
        prov = get_provider(pid, "sk-test", None)
        assert isinstance(prov, cls)
        assert prov._headers() == {"Authorization": "Bearer sk-test"}
        # Each hosted provider ships a non-empty fallback model list as a safety
        # net for vendors that gate or omit GET /models.
        assert cls.fallback_models(), f"{pid} has no fallback models"


def test_new_providers_require_a_key():
    from app.providers import ProviderError, get_provider

    for pid in ("qwen", "xai", "meta", "sarvam"):
        with pytest.raises(ProviderError) as exc:
            get_provider(pid, None, None)
        assert exc.value.error_type == "invalid_key"


def _mock_client(handler):
    """Return a no-arg factory yielding an AsyncClient backed by a mock handler."""
    import httpx

    def factory():
        return httpx.AsyncClient(transport=httpx.MockTransport(handler))

    return factory


@pytest.mark.asyncio
async def test_list_models_falls_back_when_models_endpoint_is_404():
    """A provider that gates/omits GET /models (404) still validates: we serve
    its known fallback list instead of failing. Auth errors are NOT masked."""
    import httpx

    from app.providers.openai_compat import SarvamProvider

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": {"message": "no such route"}})

    prov = SarvamProvider(api_key="sk-test")
    prov._client = _mock_client(handler)  # type: ignore[method-assign]
    models = await prov.list_models()
    assert models == sorted(SarvamProvider.fallback_models())


@pytest.mark.asyncio
async def test_list_models_falls_back_when_models_endpoint_is_empty():
    import httpx

    from app.providers.openai_compat import MetaLlamaProvider

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": []})

    prov = MetaLlamaProvider(api_key="sk-test")
    prov._client = _mock_client(handler)  # type: ignore[method-assign]
    models = await prov.list_models()
    assert models == sorted(MetaLlamaProvider.fallback_models())


@pytest.mark.asyncio
async def test_list_models_uses_live_list_when_present():
    import httpx

    from app.providers.openai_compat import XaiProvider

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"id": "grok-4"}, {"id": "grok-3"}]})

    prov = XaiProvider(api_key="sk-test")
    prov._client = _mock_client(handler)  # type: ignore[method-assign]
    models = await prov.list_models()
    assert models == ["grok-3", "grok-4"]


@pytest.mark.asyncio
async def test_list_models_does_not_mask_auth_errors():
    """A 401 must still surface as invalid_key even though a fallback exists —
    otherwise a bad key would look valid."""
    import httpx

    from app.providers import ProviderError
    from app.providers.openai_compat import QwenProvider

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "bad key"}})

    prov = QwenProvider(api_key="wrong")
    prov._client = _mock_client(handler)  # type: ignore[method-assign]
    with pytest.raises(ProviderError) as exc:
        await prov.list_models()
    assert exc.value.error_type == "invalid_key"


def test_local_providers_are_keyless():
    providers = client.get("/api/providers").json()
    by_id = {p["id"]: p for p in providers}
    for pid in ("ollama", "llamacpp"):
        assert pid in by_id, f"{pid} missing from provider list"
        assert by_id[pid]["needs_key"] is False
    # llama.cpp defaults to its local OpenAI-compatible server
    assert by_id["llamacpp"]["default_base_url"] == "http://localhost:8080/v1"


def test_llamacpp_provider_is_keyless_and_local():
    from app.providers import get_provider
    from app.providers.openai_compat import LlamaCppProvider

    # keyless: constructing without a key must not raise
    prov = get_provider("llamacpp", None, None)
    assert isinstance(prov, LlamaCppProvider)
    # no key => no Authorization header; with a key => bearer sent
    assert prov._headers() == {}
    assert get_provider("llamacpp", "sk-x", None)._headers() == {"Authorization": "Bearer sk-x"}


def test_llamacpp_unreachable_gives_actionable_network_error():
    # Nothing is serving :8080 in tests, so validate should fail fast with a
    # typed network error that tells the user how to start a server.
    r = client.post("/api/providers/validate", json={"provider": "llamacpp"})
    assert r.status_code == 502
    body = r.json()
    assert body["error"]["type"] == "network"
    assert "llama.cpp server" in body["error"]["message"]


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


def test_execute_endpoint_is_gone():
    # Learner code is never executed: the old execution endpoint must not exist.
    r = client.post("/api/execute", json={"code": "x", "tests": []})
    assert r.status_code == 404


def test_no_route_imports_the_executor():
    # Defense in depth: the API module must not pull in the executing runner.
    import app.main as main_module

    assert not hasattr(main_module, "run_exercise")


def test_verify_endpoint_accepts_valid_code():
    r = client.post(
        "/api/verify",
        json={
            "code": "def add(a, b):\n    return a + b",
            "starter_code": "def add(a, b):\n    pass",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["passed"] is True
    assert body["all_checks_passed"] is True
    # Static facts, no execution.
    assert "add" in body["facts"]["functions"]


def test_verify_endpoint_reports_syntax_error():
    r = client.post("/api/verify", json={"code": "def broken(:\n    return 1"})
    body = r.json()
    assert body["valid"] is False
    assert body["passed"] is False
    assert body["error"]["lineno"] == 1


def test_verify_unimplemented_stub_does_not_pass():
    r = client.post(
        "/api/verify",
        json={
            "code": "def add(a, b):\n    pass",
            "starter_code": "def add(a, b):\n    pass",
        },
    )
    body = r.json()
    assert body["valid"] is True  # it parses
    assert body["passed"] is False  # but it's an unchanged, unimplemented stub


def test_verify_never_executes_submitted_code(tmp_path):
    # If the submission were executed, this file would be created. It must not be.
    sentinel = tmp_path / "PWNED"
    hostile = (
        "import os\n"
        f"open({str(sentinel)!r}, 'w').write('x')\n"
        "os.system('echo pwned')\n"
        "while True:\n    pass\n"
    )
    r = client.post("/api/verify", json={"code": hostile, "starter_code": ""})
    assert r.status_code == 200  # returns quickly; no infinite loop ran
    assert r.json()["valid"] is True  # it's valid Python, just never run
    assert not sentinel.exists(), "learner code must never be executed"


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


def test_demo_revise_tunes_explanation():
    r = client.post(
        "/api/ai/revise",
        json={
            "provider": "demo",
            "model": "demo-tutor-1",
            "original": "A variable stores a value.",
            "instruction": "use an analogy",
            "lesson_context": "python basics",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "use an analogy" in body["explanation"]
    # the revision references the original content, not a brand-new answer
    assert "variable" in body["explanation"].lower()


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
