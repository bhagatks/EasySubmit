# Resume Rules V2 — Testing Guide

## Quick start

v2 is **on by default** when:

- Feature flag `resume_rules_v2` is enabled (default: **true** in registry)
- Form page mode is one of **`1` | `2` | `3` | `4+`** (default **`2`**; legacy **`4`** → **`4+`**)

Optional env overrides (take precedence):

```bash
RESUME_RULES_V2_ENABLED=true          # force on (server)
RESUME_RULES_V2_ENABLED=false         # force off (server)
NEXT_PUBLIC_RESUME_RULES_V2=true      # force on (client ATS panel)
NEXT_PUBLIC_RESUME_RULES_V2=false     # force off (client)
```

After changing flags, restart dev server.

## Automated tests

```bash
# Core v2 unit + sample job E2E + wiring regressions (both Fidelity fixtures)
npx vitest run --config config/vitest.config.ts lib/resume/v2/

# Branch-focused v2 coverage (repair, validate, readiness, keyword scoring, runtime)
npx vitest run --config config/vitest.config.ts lib/resume/v2/branch-coverage.test.ts

# Full v2 wiring batch
npx vitest run --config config/vitest.config.ts \
  lib/resume/v2/ \
  lib/features/resolve-resume-rules-v2.test.ts \
  lib/features/index.test.ts \
  lib/job-tracker/export/resume-content-model.test.ts \
  lib/resume/validation/ \
  lib/services/feature-flags-service.test.ts \
  lib/ai/engine/enhance-preflight.test.ts \
  lib/ai/ai-health-status.test.ts

# Scoped v2 coverage report (requires .env.local for suites that load DB env)
npx vitest run --config config/vitest.config.ts --coverage \
  --coverage.include 'lib/resume/v2/**/*.ts' \
  --coverage.include 'lib/features/resolve-resume-rules-v2.ts' \
  --coverage.include 'lib/resume/validation/validate-resume-v2-bridge.ts' \
  --coverage.include 'lib/resume/page-length-preference.ts' \
  --coverage.include 'lib/resume/resume-length-select-options.ts' \
  --coverage.reportsDirectory coverage-v2 \
  lib/resume/v2/

# Full lib/ coverage gate (pre-push hook)
npm run test:coverage

# Score both sample jobs across all page modes (no API)
npm exec --yes tsx .tmp-debug/v2-score-both-jobs.mts
```

**Coverage targets (v2 stack):** lines/functions **>90%**, branches **>85%** — see `lib/resume/v2/branch-coverage.test.ts`.

## Dev server note

If the dashboard 500s with webpack errors mentioning `rake-js` `.js.map` files, clear `.next/cache` after pulling — `next.config.mjs` ignores those broken source maps so the v2 readiness scorer (via `AtsPanel`) can load in the client bundle.

## Manual E2E checklist

### 1. Job tailor + enhance pipeline

1. Open a job → Resume studio (`/dashboard/job-tracker/[id]/resume`)
2. Confirm **Resume length** shows all v2 page modes with descriptions
3. Run **Enhance with AI** on mode **2** — repair trims to tier budgets
4. Switch to **4+ extended** → re-enhance — bullets/skills should not be tier-trimmed
5. Review Screen → **ATS** tab: v2 pillars; mode **4+** shows amber extended-mode warning banner

### 2. Page mode spot checks

| Mode | Expect |
|------|--------|
| **1** | Tighter summary/skills/bullet validation vs mode 2 |
| **3** | Higher budgets than mode 2 |
| **4+** | No content-limit errors; ATS Compliance shows parse-risk warning |

### 3. Profile studio

1. Edit profile → Layout tab → page mode selector (v2 modes when flag on)
2. Studio lint uses active profile when `resumeRulesV2` enabled

### 4. Export

1. Tailor a job with a recent role having 7+ bullets (mode **2** or **4+**)
2. Export PDF/DOCX — bullets should **not** be silently truncated to 6

### 5. Benchmark scripts (optional)

```bash
npx tsx .tmp-debug/chat-parity-v2-mobile-arch.mts
npx tsx .tmp-debug/chat-parity-v2-2page.mts
```

## Disable v2 (rollback)

- Set DB flag `resume_rules_v2` off, or `RESUME_RULES_V2_ENABLED=false`
- v1 scoring, validation, export cap, and AI prompts return automatically

## Known limits

- Keyword pillar may still cap ~16–17/25 without JD intel cache — repair + intel-first scoring help but do not guarantee 90+ on sparse JDs
- Preview page count (`resolveResumePages`) still resolves to 1 or 2 for layout; content budgets follow the selected v2 page mode
