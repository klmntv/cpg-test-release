# AGENTS.md

## Project Overview
- CPG IDE for large Go codebases (Prometheus ecosystem): Go backend + React frontend + SQLite.
- Graph is the primary UI (packages, calls, dataflow). Keep graph-first UX intact.

## Preferred Workflow (Docker)
- Start: `docker compose up --build`
- Custom port: `APP_PORT=18080 docker compose up --build`
- Low-memory fallback: `CPG_GOMEMLIMIT=2500MiB CPG_GOGC=20 CPG_GOMAXPROCS=1 docker compose up --build`
- First run is long: CPG generation can take ~10-20+ minutes.

## Local Workflow (no Docker)
- Generate DB: `make local-generate`
- Run backend: `make local-backend`
- Run frontend: `make local-frontend`

## Validation Before Finish
- Backend checks: `go test ./...`
- Frontend checks: `cd frontend && npm install && npm run build`
- If Docker-related files changed, verify `docker compose up --build` still starts `init` then `app`.

## Change Boundaries
- Do not commit generated artifacts (`*.db`, `frontend/dist`).
- Avoid unnecessary edits in vendored/submodule sources unless task explicitly requires it.
- For new graph/API features, keep bounded results (`max_depth`, `max_nodes`) to avoid UI freezes.

## Docs Sync
- If you change startup commands, env vars, or defaults, update `README.md` and `docker-compose.yml` in the same change.
