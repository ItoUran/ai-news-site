#!/usr/bin/env bash
# Linux/cron wrapper for AI radio episode generation (npm run radio:generate).
# Intended for an always-on external server (see README "外部サーバーで常時稼働させる")
# where Ollama and VOICEVOX both run as always-on systemd services.
# Logs to logs/ since cron does not keep stdout by default.

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/radio-generate-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== radio generate task started ==="

if ! curl -sf --max-time 5 "http://127.0.0.1:11434/api/version" > /dev/null 2>&1; then
  log "Ollama not responding. Skipping this run."
  exit 1
fi
log "Ollama: OK"

if ! curl -sf --max-time 5 "http://127.0.0.1:50021/version" > /dev/null 2>&1; then
  log "VOICEVOX not responding. Skipping this run."
  exit 1
fi
log "VOICEVOX: OK"

cd "$PROJECT_DIR"
log "Running npm run radio:generate ..."
npm run radio:generate >> "$LOG_FILE" 2>&1
log "=== radio generate task finished (exit code $?) ==="
