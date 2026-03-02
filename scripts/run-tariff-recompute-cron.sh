#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ts() {
  date +"%Y-%m-%d %H:%M:%S"
}

log() {
  echo "[$(ts)] [tariff-recompute-cron] $*"
}

# Load env files if present.
for env_file in ".env" ".env.local"; do
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
done

BASE_URL="${NEXTAUTH_URL:-${AUTH_URL:-http://127.0.0.1:3000}}"
CRON_SECRET="${NEXTAUTH_SECRET:-${AUTH_SECRET:-}}"

if [[ -z "$CRON_SECRET" ]]; then
  log "NEXTAUTH_SECRET/AUTH_SECRET missing; skip."
  exit 1
fi

if HTTP_CODE="$(curl -sS -o /tmp/tariff-recompute-cron-last.json -w "%{http_code}" -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${BASE_URL}/api/cron/tariff-recompute?limit=5")"; then
  log "POST ${BASE_URL}/api/cron/tariff-recompute?limit=5 -> HTTP ${HTTP_CODE}"
else
  log "POST ${BASE_URL}/api/cron/tariff-recompute?limit=5 -> request failed"
  exit 1
fi
