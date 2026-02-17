SHELL := /bin/sh

.PHONY: run-docker stop-docker run-local local-generate local-backend local-frontend ensure-modules

run-docker:
	docker compose up --build

stop-docker:
	docker compose down

ensure-modules:
	@if [ ! -f "./prometheus/go.mod" ] || [ ! -f "./client_golang/go.mod" ] || [ ! -f "./prometheus-adapter/go.mod" ]; then \
		git submodule update --init; \
	fi
	@if [ ! -f "./alertmanager/go.mod" ]; then \
		rm -rf ./alertmanager; \
		git clone --depth 1 https://github.com/prometheus/alertmanager.git ./alertmanager; \
	fi

local-generate: ensure-modules
	go build -o ./cpg-gen .
	./cpg-gen -skip-escape -modules "./client_golang:github.com/prometheus/client_golang:client_golang,./prometheus-adapter:sigs.k8s.io/prometheus-adapter:adapter,./alertmanager:github.com/prometheus/alertmanager:alertmanager" ./prometheus ./cpg.db

local-backend:
	go run ./cmd/cpg-serve -db ./cpg.db -addr :8080

local-frontend:
	cd frontend && npm install && npm run dev -- --host --port 5173

run-local:
	./scripts/run-local.sh
