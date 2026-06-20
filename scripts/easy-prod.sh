#!/usr/bin/env bash
# Deploy to Vercel — prod secrets live in Vercel only, not on disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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
npm test

echo "→ Production DB migrations (env pulled from Vercel, not saved locally)"
node "$ROOT/scripts/run-with-vercel-env.mjs" npx prisma generate
node "$ROOT/scripts/run-with-vercel-env.mjs" npx prisma migrate deploy

echo "→ Deploying to Vercel production"
"${VERCEL[@]}" deploy --prod

echo "✔ Production deploy complete"
