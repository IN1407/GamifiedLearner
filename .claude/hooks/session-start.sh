#!/bin/bash
# Installs backend (Python) and frontend (Node) dependencies so tests, linters,
# and the dev servers work in Claude Code on the web sessions.
set -euo pipefail

# Only run in the remote (web) environment; local devs manage their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# --- Backend: Python venv + deps ---
cd "$ROOT/backend"
if command -v uv >/dev/null 2>&1; then
  uv venv .venv >/dev/null 2>&1 || true
  uv pip install --python .venv/bin/python -r requirements.txt
else
  python3 -m venv .venv
  ./.venv/bin/pip install --upgrade pip >/dev/null
  ./.venv/bin/pip install -r requirements.txt
fi

# --- Frontend: Node deps (install, not ci, to benefit from container caching) ---
cd "$ROOT/frontend"
npm install

echo "GamifiedLearner dependencies installed (backend .venv + frontend node_modules)."
