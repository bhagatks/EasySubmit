# Environment domains

EasySubmit uses **env domains** — each script category may only load keys from its domain. This prevents PostHog closeout from ever touching `DATABASE_URL` / `DIRECT_URL`.

## Domains

| Domain | Who uses it | Allowed keys from `.env.local` | DB URLs |
|--------|-------------|----------------------------------|---------|
| **database** | `run easy`, `db:migrate`, Vercel build, `prod:health` | Full file (local dev only) | Yes |
| **prod-debug** | `enhance:trace:prod`, `pool:status:prod`, `run-prod-debug.mjs` | **Never** — use `.env.prod.local` | Yes (prod ref only) |
| **posthog-admin** | `analytics:closeout`, `analytics:configure`, `analytics:setup` | `POSTHOG_PERSONAL_API_KEY`, project IDs, host | **Never** |
| **posthog-runtime** | Next.js app, extension build | `NEXT_PUBLIC_POSTHOG_*` (dev) | No |

## Rules (enforce in code review)

0. **Single source of truth:** `lib/env/env-resolution.mjs` — do not add ad-hoc `.env.local` loading in new scripts.
1. **PostHog admin scripts** must call `buildPostHogAdminEnv()` from `lib/env/env-resolution.mjs` and `assertPostHogOnlyEnv()` at startup.
2. **Never** `dotenv.config({ path: ".env.local" })` in PostHog scripts — loads the whole file including DB URLs.
3. **Never** `mergeEnv(process.env, localVars)` in PostHog scripts — `process.env` may already carry stale `DATABASE_URL`.
4. **`prisma.config.ts`** does not load `.env.local` — database env is injected by runners only.
5. **`run.mjs admin`** strips database keys from parent env before `vercel env run`.

## Implementation

- `lib/env/env-resolution.mjs` — `buildPostHogAdminEnv`, `stripDatabaseEnv`, `assertPostHogOnlyEnv`
- `scripts/env-lib.mjs` — `resolveAnalyticsAdminEnv()` → `buildPostHogAdminEnv()`
- `scripts/env-lib.mjs` — `resolveLocalDevEnv()` → full `.env.local` for `run easy` only
- Tests: `lib/env/env-resolution.test.ts`

## Commands

```bash
# PostHog only — needs phx_ in .env.local; never touches DATABASE_URL
npm run analytics:closeout

# Local dev — injects full .env.local including DATABASE_URL
run easy

# Prod DB check — Vercel only; never .env.local
npm run prod:health

# Prod job/enhance debug — `.env.prod.local` (see .env.prod.example); never Vercel pull
npm run enhance:trace:prod -- --user-id <id> --job <id> --posthog
```
