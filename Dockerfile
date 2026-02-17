# App: backend + frontend static. Depends on cpg.db from init volume.
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM golang:1.25-bookworm AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /cpg-serve ./cmd/cpg-serve

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=backend /cpg-serve /cpg-serve
COPY --from=frontend /app/dist /app/dist
VOLUME /data
ENV DB_PATH=/data/cpg.db
ENV STATIC_DIR=/app/dist
EXPOSE 8080
CMD ["sh", "-c", "until [ -f /data/cpg.db ]; do echo 'Waiting for CPG database...'; sleep 5; done; exec /cpg-serve -db /data/cpg.db -static /app/dist -addr :8080"]
