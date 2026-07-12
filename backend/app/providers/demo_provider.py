"""Demo provider: a fake local "model" so the whole app is clickable with no
API key. Responses are deterministic templates keyed off the request mode
(the system prompt carries a mode marker set in prompts.py)."""

from __future__ import annotations

import json
import re

from .base import ChatMessage, LLMProvider


def _extract(tag: str, text: str) -> str:
    m = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", text, re.DOTALL)
    return m.group(1) if m else ""


class DemoProvider(LLMProvider):
    name = "demo"

    @classmethod
    def default_base_url(cls) -> str:
        return "local://demo"

    async def list_models(self) -> list[str]:
        return ["demo-tutor-1"]

    async def chat(
        self, model: str, messages: list[ChatMessage], max_tokens: int = 1024
    ) -> str:
        system = "\n".join(m.content for m in messages if m.role == "system")
        user = "\n".join(m.content for m in messages if m.role == "user")

        if "[MODE:GRADE]" in system:
            return self._grade(user)
        if "[MODE:REVISE]" in system:
            return self._revise(user)
        if "[MODE:EXPLAIN]" in system:
            return self._explain(user)
        return self._chat(user)

    def _revise(self, user: str) -> str:
        instruction = _extract("how_to_change_it", user) or "your request"
        original = _extract("current_explanation", user) or "the explanation"
        return (
            f"**Demo mode — revised for: _{instruction}_** (connect a real AI provider "
            f"in Settings for a genuine rewrite).\n\n"
            f"Here's the same idea, adjusted. {original[:400]}\n\n"
            f"*(A real model would rewrite this to satisfy “{instruction[:120]}” while "
            f"keeping the facts and the learning point intact.)*"
        )

    def _explain(self, user: str) -> str:
        question = _extract("question", user) or "the question"
        chosen = _extract("user_answer", user) or "your answer"
        correct = _extract("correct_answer", user) or "the correct answer"
        return (
            f"**Demo mode explanation** (connect a real AI provider in Settings for a "
            f"personalized one).\n\n"
            f"You picked *{chosen}*, but the correct answer is *{correct}*.\n\n"
            f"Re-read the lesson section this question came from — the distinction the "
            f"question tests ({question[:120]}…) is stated there directly. A good study "
            f"move: explain out loud why each of the other choices is wrong. If you can't "
            f"rule one out, that's the exact gap to review before retrying the quiz."
        )

    def _grade(self, user: str) -> str:
        submission = _extract("submission", user)
        words = len(submission.split())
        # Deterministic scoring so QA runs are reproducible: length + structure
        # signals only. This is a stand-in, not real grading.
        score = 40
        if words >= 30:
            score += 20
        if words >= 80:
            score += 10
        if any(k in submission.lower() for k in ("example", "format", "step", "must", "constraint")):
            score += 15
        score = min(score, 90)
        result = {
            "score": score,
            "verdict": "Demo grading — deterministic placeholder, not a real model judgment.",
            "strengths": [
                "Submission received and parsed correctly."
                + (" Good length and detail." if words >= 30 else "")
            ],
            "improvements": [
                "Connect a real AI provider in Settings to get substantive rubric-based feedback.",
                "Be explicit about the output format you want."
                if "format" not in submission.lower()
                else "Consider adding a concrete example to anchor the model.",
            ],
            "suggested_rewrite": "(Available with a real provider connected.)",
            "unverified": ["Demo mode cannot verify correctness claims."],
        }
        return json.dumps(result)

    def _chat(self, user: str) -> str:
        return (
            "**Demo mode.** I'm a canned local stand-in, not a real model. "
            "I can't actually answer your question — connect an AI provider in "
            "Settings (or use Ollama locally for free) to enable the course assistant. "
            f"You asked: “{user[:160]}”"
        )
