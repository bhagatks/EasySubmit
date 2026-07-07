# Development workflow

EasySubmit uses **command-specific env injection** — variables are loaded into process memory per command. Runners never rename, copy, or hide `.env` files at runtime.

Full env reference: [`ENV.md`](./ENV.md) · Production deploy: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · Prod cutover: [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) · Extension builds: [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md) · **Extension dev + prod launch:** [`EXTENSION_LAUNCH_RUNBOOK.md`](./EXTENSION_LAUNCH_RUNBOOK.md)

---

## Philosophy: injection vs mutation

| Old pattern (removed) | New pattern |
|----------------------|-------------|
| Rename `.env.local` → `.bak` during prod ops | Load vars into `process.env` for child processes only |
| Maintain `.env.prod.local` as prod source of truth | Production secrets live in **Vercel Dashboard** only |
| `vercel env sync` from local files | `vercel deploy --prod` + `vercel-build` uses dashboard env |
| Prod admin tasks overwrite/swap files | `npm run prod:health` pulls Vercel env to a **temp file**, parses, deletes |

This prevents dev credentials from leaking into prod commands and vice versa.

**Env domains** (enforced in `lib/env/env-resolution.mjs`): database scripts and PostHog admin scripts are isolated — see [`rules/env-domains.md`](./rules/env-domains.md).

---

## Daily commands

| Command | Env source | Pipeline |
|---------|------------|----------|
| `run easy` | `.env.local` | 1 preflight → 2 DB safety → 3 prisma → 4 tests → 5 extensions (`dist/extension-dev` + `dist/extension`) → 6 `next dev` |
| `run easy fast` | `.env.local` | same, skip step 4 (tests) |
| `run easy prod` | Vercel dashboard | 1 preflight → 2 tests → 3 prisma validate → 4 deploy → 5 smoke reminder |
| `run easy prod fast` | Vercel dashboard | deploy only (steps 2–3 skipped) |
| `npm run dev` / `dev:fast` | aliases | same as `run easy` / `run easy fast` |
| `npm run deploy:prod` | alias | same as `run easy prod` |

**Shell setup:** add repo root to `PATH` (see [`ENV.md`](./ENV.md)) so `run easy` works from any folder in the project.

Full troubleshooting: [`DEPLOYMENT_TROUBLESHOOTING.md`](./DEPLOYMENT_TROUBLESHOOTING.md)

---

## Adding a new environment variable

1. **`.env.example`** — add the key with a placeholder and comment (committed).
2. **`.env.local`** — set the real dev value (gitignored).
3. **Vercel Dashboard** → Project → Settings → Environment Variables → **Production** (and Preview if needed).
4. **`.env.vercel.example`** — add to the prod checklist (reference only, never copied locally).

No sync script — set prod values directly in Vercel.

---

## Database URLs (Prisma 7)

`prisma.config.ts` does **not** load `.env.local`. URLs are injected by `scripts/run.mjs` (local) or Vercel (prod).

| Variable | Purpose | Supabase source |
|----------|---------|-----------------|
| `DATABASE_URL` | App runtime | Transaction pooler `:6543?pgbouncer=true` (prod) or session `:6543` (local dev) |
| `DIRECT_URL` | `prisma migrate` only | Session pooler **`:5432`** (local + prod) |

Migrations need `DIRECT_URL` because PgBouncer transaction mode does not support advisory locks. Wrapper: `scripts/prisma-migrate-deploy.mjs` · local: `npm run db:migrate`.

Production migrations run during Vercel build via `vercel-build` → `prisma-migrate-deploy.mjs`.

---

## Safety guardrails

- **`next dev`** refuses to start if `DATABASE_URL` contains the prod Supabase ref (`yofgnflcqajqsepbfdkc`).
- **`prisma migrate reset`** blocked on prod URLs; requires `EASYSUBMIT_ALLOW_DESTRUCTIVE_DB=1` for local dev only.
- **Local `prisma migrate dev`** blocked against production `DATABASE_URL`.

---

## Admin tasks against production

Vercel Production env only — `run.mjs admin` strips laptop `DATABASE_URL` / `DIRECT_URL` before `vercel env run`:

```bash
npm run prod:health
npm run prod:ensure-avatars-bucket
node scripts/run.mjs admin -- node scripts/prisma-migrate-deploy.mjs   # prod migrate
node scripts/run.mjs admin -- npx prisma migrate status
```

PostHog closeout is **not** admin — it uses `buildPostHogAdminEnv()` and never reads DB URLs: `npm run analytics:closeout`.

Requires one-time `vercel link` and secrets in the Vercel dashboard.

---

## First-time local setup

```bash
cp .env.example .env.local   # or: run easy (auto-creates on first run)
# Edit .env.local: DATABASE_URL, DIRECT_URL, OAuth, Supabase keys
run easy                     # or: run easy fast (skip tests)
```

Extension output folders (`dist/extension-dev` vs `dist/extension`): [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)

---

## Chrome extension — local dev

**Full checklist:** [`EXTENSION_LAUNCH_RUNBOOK.md`](./EXTENSION_LAUNCH_RUNBOOK.md) § A (dev)

| Step | Action |
|------|--------|
| Build | `run easy` builds **both** `dist/extension-dev/` and `dist/extension/` |
| Load | `chrome://extensions` → Load unpacked → **`dist/extension-dev`** (toolbar: **Dev Easy**) |
| Connect | `http://localhost:3000/extension/bridge?extensionId=<unpacked-id>` — id from `chrome://extensions`, not the CWS id |
| After code change | Reload extension on `chrome://extensions` or re-run `npm run build:extension` |
| Tests | `npx vitest run --config config/vitest.config.ts lib/extension/` |
| Prod API QA | Second Chrome profile + **`dist/extension`** + bridge on `https://www.easysubmit.ai` |

**Do not** upload `dist/extension-dev/` to Chrome Web Store. **Do not** use prod Supabase in `.env.local`.

Publish to users: [`EXTENSION_LAUNCH_RUNBOOK.md`](./EXTENSION_LAUNCH_RUNBOOK.md) § B–C (prod only — GitHub Actions + `publish_to_cws`).
