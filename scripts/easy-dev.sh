#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3000}"

stop_existing_servers() {
  local pids

  pids="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Stopping existing server on port $PORT"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.3
    pids="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi

  pids="$(pgrep -f "$ROOT/node_modules/.bin/next (dev|start)" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Stopping existing EasySubmit Next.js process"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
}

clear_production_next_cache() {
  if [[ -f "$ROOT/.next/BUILD_ID" ]]; then
    echo "→ Clearing stale production .next cache (conflicts with next dev)"
    rm -rf "$ROOT/.next"
  fi
}

stop_existing_servers

clear_production_next_cache

echo "→ Syncing Prisma schema to database"
npx prisma generate
npx prisma db push --accept-data-loss

echo "→ EasySubmit dev server (http://localhost:$PORT)"
exec npx next dev -p "$PORT"
