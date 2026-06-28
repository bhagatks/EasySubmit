# Testing — coverage gate

Unit test coverage in `lib/` must stay above 85% across all metrics (statements, branches, functions, lines) before any push is allowed.

## Gate

A pre-push git hook runs `npm run test:coverage` automatically. If any metric is below 85%, the push is blocked. This is enforced via `.githooks/pre-push` + vitest thresholds in `config/vitest.config.ts`.

## Rules

- Every new shared logic file added to `lib/` must have a corresponding `.test.ts`
- Every new branch, gate, or edge case in existing `lib/` code needs a test
- Do NOT test: React components, hooks, server actions, files that require Prisma/Supabase/fetch — these cannot run in Vitest without a browser or real DB
- Do NOT mock the database — skip files that genuinely require external deps rather than writing fake tests that give false confidence
- Run `npm run test:coverage` after adding tests to verify the gate passes

## Commands

```bash
# Check current coverage
npm run test:coverage

# Run tests only (no coverage)
npm test

# Run a specific file
npx vitest run --config config/vitest.config.ts lib/features/index.test.ts
```
