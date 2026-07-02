# Deployment troubleshooting

Lessons from the June 2026 prod cutover. **Normal deploy = push to `main` only** — see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Golden rules

| Do | Don't |
|----|--------|
| Set prod secrets **once** in Vercel → Production | Re-sync or bulk-copy env vars on every deploy |
| Push code to `main` (Vercel auto-builds) | Put `DATABASE_URL` / OAuth in GitHub Actions |
| Keep dev secrets in `.env.local` only | Let `.env.local` load during `vercel env run` or Vercel build |
| Prod migrate via `prisma-migrate-deploy.mjs` / Vercel `vercel-build` | Raw `npx prisma migrate deploy` when prod is the target |
| Fix one env var in dashboard → redeploy | Run ad-hoc env sync scripts against prod |
| Use GitHub CI for **tests** + extension build only | Expect CI to deploy the web app |
| PostHog closeout (`analytics:closeout`) for `phx_` keys only | Let PostHog scripts load full `.env.local` or spread `process.env` with DB URLs |

---

## Env domains

PostHog admin scripts and database scripts **must not share env loading**:

| Script type | Allowed from `.env.local` | `DATABASE_URL` |
|-------------|---------------------------|----------------|
| `analytics:closeout` | `POSTHOG_PERSONAL_API_KEY`, project IDs | **Never** |
| `run easy` / `db:migrate` | Full file (dev) | Yes (dev) |
| `prod:health` / Vercel build | — (Vercel only) | Yes (prod) |

See [`rules/env-domains.md`](./rules/env-domains.md). Implementation: `lib/env/env-resolution.mjs`.

**Symptom:** `◇ injected env from .env.local` during prod migrate, or `P1000` with dev Supabase ref during prod ops → env domain violation; use `run.mjs admin` or Vercel build, not raw `npx prisma migrate deploy`.

---

## Normal prod deploy (web)

1. Merge / push to `main` (preferred — Vercel auto-builds)
2. Or manual: `run easy prod` (tests → prisma validate → `npx vercel deploy --prod --yes`)
3. On Vercel: `prisma generate` → `migrate deploy` (`DIRECT_URL`) → `next build`
4. Smoke test: https://www.easysubmit.ai/login

**No env push step.** Vercel reuses Production variables already saved.

Manual from laptop: `run easy prod` (full) or `run easy prod fast` (deploy only).

---

## Required Vercel Production variables

Checklist: [`.env.vercel.example`](../.env.vercel.example). Minimum for a green build:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Transaction pooler **`:6543`** + `?pgbouncer=true` |
| `DIRECT_URL` | Session pooler **`:5432`** (same region/password as `DATABASE_URL`) |
| `NEXTAUTH_URL` | `https://www.easysubmit.ai` (no trailing slash) |
| `NEXTAUTH_SECRET` | Prod-only |
| `GOOGLE_*` / `LINKEDIN_*` | **Prod** OAuth clients |
| `NEXT_PUBLIC_SUPABASE_*` | Prod project `yofgnflcqajqsepbfdkc` |

### `DIRECT_URL` (most common prod build failure)

- **Used only at build time** by `scripts/prisma-migrate-deploy.mjs`
- **Not** set in `prisma.config.ts` — Prisma 7 TypeScript types reject `directUrl` there and `next build` type-checks that file
- **Recommended:** `aws-1-us-west-2.pooler.supabase.com:5432` (session pooler)
- **Avoid for Vercel:** `db.yofgnflcqajqsepbfdkc.supabase.co:5432` if you see **P1001** (can't reach server)

### Verifying vars in Vercel (Sensitive)

Sensitive values are **hidden** after save. You cannot "view" them in the list.

1. Search the variable name
2. **⋯ → Edit** — confirm the field is not empty
3. **⋯ → Copy to Clipboard** — paste locally to verify shape (never commit)
4. "Added 50m ago" only means the row was **re-created** — not necessarily wrong

---

## Build errors

| Error | Cause | Fix |
|-------|--------|-----|
| `directUrl does not exist` in `prisma.config.ts` | `directUrl` in `prisma.config.ts` | Remove it; migrations use `DIRECT_URL` via `prisma-migrate-deploy.mjs` |
| `Cannot resolve environment variable: DATABASE_URL` (CI) | GitHub has no DB | CI uses placeholder URLs in `.github/workflows/ci.yml` — expected |
| `P1001: Can't reach database server at …:5432` | Bad/unreachable `DIRECT_URL` | Set session pooler `:5432` in Vercel; redeploy |
| `DIRECT_URL is required` | Missing in Vercel Production | Add per `.env.vercel.example` |
| `P3009` / failed migration | Stuck `_prisma_migrations` | [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) |
| `P1000` password auth failed on prod ops | Laptop `.env.local` leaked into Prisma/admin | Use `run.mjs admin`; `prisma.config.ts` must not load `.env.local`; see env domains |
| `npm run prod:health` → DATABASE_URL missing | Empty var in Vercel or pull failed | Edit `DATABASE_URL` in dashboard |

---

## GitHub Actions (not web deploy)

| Workflow | Purpose |
|----------|---------|
| [`ci.yml`](../.github/workflows/ci.yml) | Vitest on PR/push — placeholder `DATABASE_URL`/`DIRECT_URL` for `prisma generate` only |
| [`deploy.yml`](../.github/workflows/deploy.yml) | Extension: test → build → sign CRX → optional CWS upload |

**Chrome Web Store:** Listing uses Verified CRX uploads — CI produces `easysubmit-extension.crx`. `publish_to_cws` is **off** on push while listing is under review. After approval: manual workflow + bump `extension/manifest.json` version. Add GitHub secret `CHROME_CRX_PRIVATE_KEY` (full PEM) before enabling publish.

---

## Emergency: site broken after bad deploy

1. Vercel → **Deployments**
2. Find last **Ready** production deploy
3. **⋯ → Promote to Production**

Then fix env or code without re-touching unrelated variables.

---

## Admin commands (optional)

Read-only / diagnostics — **do not** bulk-write env:

```bash
npm run prod:health              # migrations + avatars check (Vercel env pull)
npm run prod:ensure-avatars-bucket
npm run env:whoami               # confirm local .env.local is dev, not prod
```

---

## Related

- [`rules/env-domains.md`](./rules/env-domains.md) — PostHog vs database env
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — architecture + secrets map
- [`ENV.md`](./ENV.md) — local vs prod files
- [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) — first-time checklist
- [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) — P3009
