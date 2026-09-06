#!/usr/bin/env bash
# Linux/cron wrapper for local Ollama-based news ingestion (npm run ingest:local).
# Intended for an always-on external server (see README "外部サーバーで常時稼働させる")
# where Ollama runs as an always-on systemd service, unlike the Windows PC version
# (run-local-ingest.ps1) which also tries to start Ollama on demand.
# Logs to logs/ since cron does not keep stdout by default.

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/ingest-local-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== local ingest task started ==="

if ! curl -sf --max-time 5 "http://127.0.0.1:11434/api/version" > /dev/null 2>&1; then
  log "Ollama not responding (expected to run as a systemd service on this server). Skipping this run."
  exit 1
fi
log "Ollama: OK"

cd "$PROJECT_DIR"
log "Running npm run ingest:local ..."
npm run ingest:local >> "$LOG_FILE" 2>&1
log "=== local ingest task finished (exit code $?) ==="
