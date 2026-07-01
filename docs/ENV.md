# Environment

Command-specific injection — see [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) for philosophy and safety rules.

| Command | Purpose |
|---------|---------|
| **`run easy`** | Preflight → DB safety → prisma → tests → extension → `next dev` |
| **`run easy fast`** | Same, skip tests (`npm run dev:fast`) |
| **`run easy prod`** | Preflight → tests → prisma validate → `npx vercel deploy --prod --yes` |
| **`run easy prod fast`** | Deploy only (`npm run prod:repair`) |

Aliases: `npm run dev`, `npm run easy`, `npm run deploy:prod`, `npm run easy:prod`.

### One-time shell setup

Add the repo root to your `PATH` so `run easy` works from any subdirectory:

```bash
export PATH="/path/to/EasySubmit:$PATH"
```

Or symlink: `ln -sf /path/to/EasySubmit/run ~/.local/bin/run`

## Local dev

```bash
run easy
```

First run auto-creates `.env.local` from `.env.example` if missing. Set `DATABASE_URL`, `DIRECT_URL`, and OAuth before migrating.

Pipeline (`scripts/run.mjs dev`):

1. Preflight — stop stale server, bootstrap `.env.local`, print dev Supabase target
2. DB safety — block prod `DATABASE_URL`, validate connection
3. `prisma generate` + `prisma migrate deploy` (uses `DIRECT_URL`)
4. `npm test` (skip with `run easy fast`)
5. `npm run build:extensions` → `dist/extension-dev/` (localhost) + `dist/extension/` (prod) — see [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)
6. `next dev` on port 3000

Fast iteration (skip tests): `run easy fast` or `npm run dev:fast`

Optional auto-open incognito login:

```bash
EASY_OPEN_BROWSER=1 npm run dev
```

## Production deploy

Prod secrets live in **Vercel → Environment Variables** (checklist: `.env.vercel.example`).

```bash
run easy prod
```

Pipeline:

1. Git preflight (warn if not on `main` or dirty tree)
2. `npm test`
3. `npx prisma validate` (schema + `prisma.config.ts`; placeholder DB URLs locally)
4. `npx vercel deploy --prod --yes` — on Vercel: `prisma generate` → migrate deploy (`DIRECT_URL`) → `next build`
5. Smoke-test reminder → https://www.easysubmit.ai/login

**Fast path:** `run easy prod fast` or `npm run prod:repair` (deploy only).

**Not included (separate paths):** extension store build (GitHub Actions), env sync (Vercel dashboard only).

One-time: `vercel login` and `vercel link`.

Fast deploy only (skip local gates): `run easy prod fast` or `npm run prod:repair`.

## Files

```
.env.example           → local dev template (committed)
.env.vercel.example    → Vercel prod checklist (committed, not copied locally)
.env.local             → local dev secrets only (gitignored)
```

**No `.env.prod.local`** — production values are set in the Vercel dashboard only.

## Prisma connection strings

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | Transaction pooler — app runtime |
| `DIRECT_URL` | Session pooler `:5432` — `prisma migrate deploy` on Vercel build only |

`prisma.config.ts` sets `url` only. Migrations swap in `DIRECT_URL` in `scripts/prisma-migrate-deploy.mjs` (do **not** add `directUrl` to `prisma.config.ts` — breaks `next build` types).

## Admin / prod diagnostics

Ephemeral Vercel env pull (no local prod file):

```bash
npm run prod:health
npm run prod:ensure-avatars-bucket
node scripts/run.mjs admin -- npx prisma migrate status
```

## OAuth credentials

Login uses NextAuth (Google + LinkedIn). Required vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_*`, `LINKEDIN_*`.

**Full setup:** [`docs/oauth-setup.md`](./oauth-setup.md)  
**Production cutover:** [`docs/PROD_CUTOVER.md`](./PROD_CUTOVER.md)

## Troubleshooting

**Deploy failed?** Start with [`DEPLOYMENT_TROUBLESHOOTING.md`](./DEPLOYMENT_TROUBLESHOOTING.md).

**`Application error` / `(EMAXCONNSESSION) max clients reached`:** Production `DATABASE_URL` must use Supabase **transaction** pooler (`:6543?pgbouncer=true`), not session `:5432`. Set in Vercel dashboard and redeploy.

**Vercel build `P1001` on `:5432`:** Set `DIRECT_URL` to **session pooler** `:5432` (same region as `DATABASE_URL`), not `db.*.supabase.co` if unreachable. See `.env.vercel.example`.

**`directUrl does not exist` in `prisma.config.ts`:** Do not add `directUrl` to `prisma.config.ts` — migrations use `DIRECT_URL` via `scripts/prisma-migrate-deploy.mjs`.

**P1000 on local dev:** update `DATABASE_URL` in `.env.local`, run `npm run dev` again.

**OAuth loops locally:** fresh incognito window, or `EASY_OPEN_BROWSER=1 npm run dev`. See [`oauth-setup.md`](./oauth-setup.md).

## Analytics (PostHog)

See [`docs/analytics-option-a.md`](./analytics-option-a.md).

| Variable | Dev (`.env.local`) | Prod (Vercel) |
|----------|-------------------|---------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Dev project `488025` | Prod project `488042` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | `dev` | `prod` |
| `POSTHOG_PERSONAL_API_KEY` | `phx_…` (for journey report) | optional |

Journey report: `npm run posthog:journey`

## Production deployment

**Two deploy paths** (web + extension): see **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

- **Web app:** Vercel GitHub integration → secrets in Vercel Dashboard  
- **Extension:** `.github/workflows/deploy.yml` → secrets in GitHub Actions

