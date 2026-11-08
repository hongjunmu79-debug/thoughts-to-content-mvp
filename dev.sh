#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
API_PID=""
WEB_PID=""

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required: https://docs.astral.sh/uv/"
  exit 1
fi

if [ ! -d web/node_modules ]; then
  echo "Installing web dependencies..."
  npm --prefix web install
fi

cleanup() {
  if [ -n "$API_PID" ]; then kill "$API_PID" 2>/dev/null || true; fi
  if [ -n "$WEB_PID" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

echo "Starting API at http://localhost:8000"
(cd server && UV_CACHE_DIR="$PROJECT_DIR/cache/uv" uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
API_PID=$!

echo "Starting web app at http://localhost:5173"
npm --prefix web run dev &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
