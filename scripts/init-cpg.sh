#!/usr/bin/env sh
set -eu

ensure_repo() {
  path="$1"
  url="$2"

  if [ -f "$path/go.mod" ]; then
    return 0
  fi

  if [ -e "$path" ]; then
    rm -rf "$path"
  fi

  echo "Fetching $path ..."
  git clone --depth 1 "$url" "$path"
}

needs_generation() {
  if [ ! -s /data/cpg.db ]; then
    return 0
  fi

  has_dashboard_table="$(
    sqlite3 /data/cpg.db \
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='dashboard_package_treemap';" \
      2>/dev/null || echo 0
  )"
  [ "$has_dashboard_table" != "1" ]
}

main() {
  mkdir -p /data

  ensure_repo "./prometheus" "https://github.com/prometheus/prometheus.git"
  ensure_repo "./client_golang" "https://github.com/prometheus/client_golang.git"
  ensure_repo "./prometheus-adapter" "https://github.com/kubernetes-sigs/prometheus-adapter.git"
  ensure_repo "./alertmanager" "https://github.com/prometheus/alertmanager.git"

  if needs_generation; then
    rm -f /data/cpg.db /data/cpg.db-shm /data/cpg.db-wal
    echo "Generating CPG (this may take a long time)..."
    /cpg-gen -skip-escape -modules \
      "./client_golang:github.com/prometheus/client_golang:client_golang,./prometheus-adapter:sigs.k8s.io/prometheus-adapter:adapter,./alertmanager:github.com/prometheus/alertmanager:alertmanager" \
      ./prometheus /data/cpg.db
  fi

  echo "ready" > /data/.ready
  echo "Init done."
}

main "$@"
