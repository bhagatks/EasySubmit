# Testing — coverage gate

Unit test coverage in `lib/` must stay above the vitest thresholds in `config/vitest.config.ts` before any push is allowed (currently **85%** statements/lines/functions and **78%** branches).

## Gate

A pre-push git hook runs `npm run test:coverage` automatically. If any metric is below 85%, the push is blocked. This is enforced via `.githooks/pre-push` + vitest thresholds in `config/vitest.config.ts`.

## Rules

- Every new shared logic file added to `lib/` must have a corresponding `.test.ts`
- Every new branch, gate, or edge case in existing `lib/` code needs a test
- Do NOT test: React components, hooks, server actions, files that require Prisma/Supabase/fetch — these cannot run in Vitest without a browser or real DB
- Do NOT mock the database — skip files that genuinely require external deps rather than writing fake tests that give false confidence
- Run `npm run test:coverage` after adding tests to verify the gate passes

## Local env

`config/vitest.config.ts` auto-loads `.env.local` into `process.env` before any worker starts, so `npm test` / `npm run test:coverage` / the pre-push hook all have `DATABASE_URL` (tests import `lib/prisma.ts`, which builds a client at module load). Prod DBs and CI (`VERCEL`, `CI`, `EASYSUBMIT_SKIP_LOCAL_ENV=1`) are skipped. Shell-set vars always win over the file.

## Commands

```bash
# Check current coverage
npm run test:coverage

# Run tests only (no coverage)
npm test

# Run a specific file
npx vitest run --config config/vitest.config.ts lib/features/index.test.ts
```
