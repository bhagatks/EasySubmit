# Environment

Command-specific injection — see [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) for philosophy and safety rules.

| Command | Purpose |
|---------|---------|
| **`run easy`** | Local dev — `.env.local` injected, never touches Vercel |
| **`run easy prod`** | Tests → extension build → `vercel deploy --prod` |

Also: `npm run dev` / `npm run deploy:prod` (same pipelines).

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

1. Bootstrap `.env.local` if absent
2. DB safety checks (block prod URLs)
3. Validate DB connection
4. `prisma generate` + `prisma migrate deploy`
5. `npm test`
6. `next dev` on port 3000

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

1. `npm test`
2. `npm run build:extension`
3. `vercel deploy --prod` — migrations run on Vercel via `vercel-build` (`prisma migrate deploy` before `next build`)

One-time: `vercel login` and `vercel link`.

Fast deploy only (skip local pipeline): `npm run prod:deploy` (same as deploy step 3).

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
| `DIRECT_URL` | Direct host — `prisma migrate` only |

See `prisma.config.ts` and [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md).

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

**`Application error` / `(EMAXCONNSESSION) max clients reached`:** Production `DATABASE_URL` must use Supabase **transaction** pooler (`:6543?pgbouncer=true`), not session `:5432`. Set in Vercel dashboard and redeploy.

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

