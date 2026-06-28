#!/usr/bin/env bash
# Deploy to Vercel — prod secrets live in Vercel only, not on disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/easy-common.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EasySubmit · deploy production (Vercel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cleanup_legacy_prod_env() {
  local removed=0
  for f in .env.production.local .env.prod.local .env.vercel.deploy.tmp; do
    if [[ -f "$ROOT/$f" ]]; then
      rm -f "$ROOT/$f"
      echo "→ Removed legacy local prod file: $f"
      removed=1
    fi
  done
  if [[ "$removed" -eq 0 ]]; then
    echo "→ No local prod env files (prod config stays on Vercel)"
  fi
}

require_vercel() {
  if command -v vercel >/dev/null 2>&1; then
    VERCEL=(vercel)
    return
  fi
  if command -v npx >/dev/null 2>&1; then
    VERCEL=(npx vercel)
    return
  fi
  echo "❌ Vercel CLI not found. Install: npm i -g vercel" >&2
  exit 1
}

cleanup_legacy_prod_env
require_vercel

if [[ ! -f "$ROOT/.vercel/project.json" ]]; then
  echo "→ Linking Vercel project (one-time)"
  "${VERCEL[@]}" link
fi

echo "→ Running tests"
easy_run_tests

easy_posthog_journey_report "pre-deploy (local .env.local)"

echo "→ Building Chrome extension (dist/extension)"
npm run build:extension

echo "→ Production DB migrations (env pulled from Vercel, not saved locally)"
if node "$ROOT/scripts/run-with-vercel-env.mjs" npx prisma generate && \
   node "$ROOT/scripts/run-with-vercel-env.mjs" npx prisma migrate deploy; then
  echo "→ Production migrations applied"
else
  echo "⚠️  Production migrations skipped (DATABASE_URL unavailable locally)."
  echo "   Re-enter secrets in Vercel → Settings → Environment Variables, then run:"
  echo "   node scripts/run-with-vercel-env.mjs -- npx prisma migrate deploy"
fi

echo "→ Deploying to Vercel production"
"${VERCEL[@]}" deploy --prod

echo "✔ Production deploy complete"
