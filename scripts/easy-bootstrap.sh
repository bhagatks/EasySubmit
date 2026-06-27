#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3000}"

# shellcheck disable=SC1091
source "$ROOT/scripts/easy-common.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EasySubmit · local dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

easy_clear_stale_shell_env
easy_stop_servers "$PORT"
easy_clear_next_cache

node "$ROOT/scripts/setup-env.mjs"
node "$ROOT/scripts/validate-database-url.mjs"

echo "→ Applying Prisma migrations"
npx prisma generate
npx prisma migrate deploy

easy_run_tests

echo "→ Building Chrome extension (dist/extension)"
npm run build:extension

easy_posthog_journey_report "local dev"

echo "→ Dev server (http://localhost:$PORT)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
easy_run_with_post_start local npx next dev -p "$PORT"
