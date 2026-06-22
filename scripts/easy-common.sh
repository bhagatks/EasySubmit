#!/usr/bin/env bash
# Shared helpers for local dev bootstrap.
set -euo pipefail

easy_stop_servers() {
  local port="${1:-3000}"
  local pids

  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Stopping existing server on port $port"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.3
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi

  pids="$(pgrep -f "${ROOT}/node_modules/.bin/next (dev|start)" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Stopping existing EasySubmit Next.js process"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
}

easy_clear_stale_shell_env() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    unset DATABASE_URL
    echo "→ Cleared stale shell DATABASE_URL"
  fi
}

easy_clear_next_cache() {
  if [[ -f "$ROOT/.next/BUILD_ID" ]]; then
    echo "→ Clearing stale production .next cache (conflicts with next dev)"
    rm -rf "$ROOT/.next"
  elif [[ -d "$ROOT/.next/cache" ]]; then
    echo "→ Clearing .next/cache"
    rm -rf "$ROOT/.next/cache"
  fi
}

easy_run_with_post_start() {
  shift # drop unused mode arg (legacy)
  local port="${PORT:-3000}"

  "$@" &
  local server_pid=$!

  cleanup() {
    kill "$server_pid" 2>/dev/null || true
  }
  trap cleanup INT TERM

  local attempt=0
  until curl -sf -o /dev/null "http://localhost:${port}/" 2>/dev/null \
    || curl -sf -o /dev/null "http://localhost:${port}/login" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge 60 ]]; then
      echo "→ Server did not become ready in time (continuing without browser open)"
      break
    fi
    if ! kill -0 "$server_pid" 2>/dev/null; then
      wait "$server_pid"
      exit $?
    fi
    sleep 0.5
  done

  if kill -0 "$server_pid" 2>/dev/null; then
    if [[ "${EASY_OPEN_BROWSER:-0}" == "1" ]]; then
      node "$ROOT/scripts/post-start.mjs" --port "$port" || true
    else
      echo "→ Dev server ready at http://localhost:${port}/login (open manually)"
      echo "→ Extension: load unpacked from dist/extension (rebuilt each run easy)"
      echo "→ Set EASY_OPEN_BROWSER=1 to auto-open incognito login"
    fi
  fi

  wait "$server_pid"
}
