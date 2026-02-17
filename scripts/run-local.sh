#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "./cpg.db" ]; then
  echo "cpg.db not found. Run 'make local-generate' first."
  exit 1
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:8080 ..."
go run ./cmd/cpg-serve -db ./cpg.db -addr :8080 &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
cd frontend
npm install
npm run dev -- --host --port 5173
