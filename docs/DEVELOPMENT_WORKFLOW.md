# Development workflow

EasySubmit uses **command-specific env injection** — variables are loaded into process memory per command. Runners never rename, copy, or hide `.env` files at runtime.

Full env reference: [`ENV.md`](./ENV.md) · Production cutover: [`PROD_CUTOVER.md`](./PROD_CUTOVER.md)

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
| `run easy` | `.env.local` (injected) | bootstrap → DB safety → validate → prisma generate → **migrate deploy** → tests → extension → posthog → `next dev` |
| `run easy prod` | Vercel (at build/runtime) | tests → extension → posthog → `vercel deploy --prod` |
| `npm run dev` | same as `run easy` | alias |
| `npm run deploy:prod` | same as `run easy prod` | alias |

**Shell setup:** add repo root to `PATH` (see [`ENV.md`](./ENV.md)) so `run easy` works from any folder in the project.

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
cp .env.example .env.local   # or: npm run dev (auto-creates on first run)
# Edit .env.local: DATABASE_URL, DIRECT_URL, OAuth, Supabase keys
npm run dev
```
