# Development workflow

EasySubmit uses **command-specific env injection** — variables are loaded into process memory per command. Runners never rename, copy, or hide `.env` files at runtime.

Full env reference: [`ENV.md`](./ENV.md) · Production deploy: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · Prod cutover: [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) · Extension builds: [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)

---

## Philosophy: injection vs mutation

| Old pattern (removed) | New pattern |
|----------------------|-------------|
| Rename `.env.local` → `.bak` during prod ops | Load vars into `process.env` for child processes only |
| Maintain `.env.prod.local` as prod source of truth | Production secrets live in **Vercel Dashboard** only |
| `vercel env sync` from local files | `vercel deploy --prod` + `vercel-build` uses dashboard env |
| Prod admin tasks overwrite/swap files | `npm run prod:health` pulls Vercel env to a **temp file**, parses, deletes |

This prevents dev credentials from leaking into prod commands and vice versa.

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

Configured in `prisma.config.ts` (not `schema.prisma`):

| Variable | Purpose | Supabase source |
|----------|---------|-----------------|
| `DATABASE_URL` | App runtime + pooler queries | **Transaction** pooler `:6543?pgbouncer=true` (prod) or **Session** `:5432` (local dev) |
| `DIRECT_URL` | `prisma migrate` only | **Direct** `db.<ref>.supabase.co:5432` |

Migrations need `DIRECT_URL` because PgBouncer transaction mode does not support advisory locks.

Production migrations run automatically during Vercel build via `vercel-build` → `prisma migrate deploy`.

---

## Safety guardrails

- **`next dev`** refuses to start if `DATABASE_URL` contains the prod Supabase ref (`yofgnflcqajqsepbfdkc`).
- **`prisma migrate reset`** blocked on prod URLs; requires `EASYSUBMIT_ALLOW_DESTRUCTIVE_DB=1` for local dev only.
- **Local `prisma migrate dev`** blocked against production `DATABASE_URL`.

---

## Admin tasks against production

Use ephemeral injection — no local prod env file:

```bash
npm run prod:health
npm run prod:ensure-avatars-bucket

# Arbitrary command with Vercel Production env (temp pull, memory only):
node scripts/run.mjs admin -- npx prisma migrate status
```

Requires one-time `vercel link` and secrets in the Vercel dashboard.

---

## First-time local setup

```bash
cp .env.example .env.local   # or: run easy (auto-creates on first run)
# Edit .env.local: DATABASE_URL, DIRECT_URL, OAuth, Supabase keys
run easy                     # or: run easy fast (skip tests)
```

Extension output folders (`dist/extension-dev` vs `dist/extension`): [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)
