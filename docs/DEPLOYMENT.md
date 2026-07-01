# Deployment

EasySubmit has **two independent production deploy paths**. They share the same GitHub repo but use different hosts, secrets, and triggers.

| Half | Delivers | Trigger | Secrets live in |
|------|----------|---------|-----------------|
| **Web app** | Next.js dashboard at `https://www.easysubmit.ai` | Push/merge to `main` → **Vercel** (native GitHub integration) | **Vercel Dashboard** → Production |
| **Chrome extension** | MV3 bundle on **Chrome Web Store** | Push to `main` (extension paths) or manual workflow | **GitHub** → Actions secrets |

Local dev is separate: [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) · env vars: [ENV.md](./ENV.md)

---

## Architecture

```
                    push to main
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   Vercel (native)              GitHub Actions
   vercel-build                  deploy.yml
         │                               │
         ▼                               ▼
  www.easysubmit.ai              Chrome Web Store
  prisma migrate + next build    vitest → store build → zip → CWS API
```

**Do not** put `DATABASE_URL`, login OAuth, or NextAuth secrets in GitHub Actions.  
**Do not** put Chrome Web Store OAuth in Vercel.

---

## Half 1 — Web app (Vercel)

### One-time setup

1. [vercel.com](https://vercel.com) → **Add New Project** → import `bhagatks/EasySubmit`
2. **Production branch:** `main`
3. Build settings (also in `vercel.json`):
   - Install: `npm install`
   - Build: `npm run vercel-build`  
     (`prisma generate` → `scripts/prisma-migrate-deploy.mjs` → `next build`)
4. Set **all Production env vars** in Vercel (checklist: `.env.vercel.example`)
5. Prod OAuth redirect URIs — see [oauth-setup.md](./oauth-setup.md):
   - `https://www.easysubmit.ai/api/auth/callback/google`
   - `https://www.easysubmit.ai/api/auth/callback/linkedin`

### Required Vercel Production variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Transaction pooler `:6543?pgbouncer=true` (prod Supabase `yofgnflcqajqsepbfdkc`) |
| `DIRECT_URL` | Session pooler **`:5432`** for `prisma migrate deploy` on build — see `.env.vercel.example` |
| `NEXTAUTH_URL` | `https://www.easysubmit.ai` |
| `NEXTAUTH_SECRET` | Prod-only (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **Prod** login OAuth (not local dev client) |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | Prod LinkedIn app |
| `NEXT_PUBLIC_SUPABASE_URL` / publishable key | Prod Supabase |
| `SUPABASE_JWT_SECRET` | Realtime + extension tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Avatar upload |
| `NEXT_PUBLIC_POSTHOG_KEY` | Prod project `488042` (`phc_…`) |

Never copy `.env.local` to Vercel — dev uses a different Supabase project.

### Day-to-day

| Action | Result |
|--------|--------|
| Merge PR to `main` | Vercel Production deploy (no env changes) |
| Manual from laptop | `run easy prod` (tests + validate + deploy + PostHog smoke) or `run easy prod fast` |

**PostHog (prod):** `vercel-build` runs `scripts/validate-analytics-env.mjs` — empty `NEXT_PUBLIC_POSTHOG_KEY` fails the build. After deploy: `npm run prod:verify-posthog`. One-shot repair: `npm run prod:repair-analytics` (syncs Vercel env from `EXTENSION_POSTHOG_KEY` or extension CI artifact, force redeploys).

Migrations run **during Vercel build** via `prisma-migrate-deploy.mjs` (uses `DIRECT_URL` from Vercel — not `directUrl` in `prisma.config.ts`).

**Troubleshooting:** [`DEPLOYMENT_TROUBLESHOOTING.md`](./DEPLOYMENT_TROUBLESHOOTING.md) — build failures, env mistakes, emergency rollback.

### First prod checklist

Full DB + OAuth cutover: [PROD_CUTOVER.md](./PROD_CUTOVER.md)

---

## Half 2 — Chrome extension (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

### Trigger

- **Automatic:** push to `main` when paths change under `extension/**`, `src/shared/**`, or extension build scripts
- **Manual:** GitHub → Actions → **Chrome Extension — Chrome Web Store** → Run workflow
- **CWS upload:** off by default on push while the listing is under review. After approval, run the workflow manually and check **publish_to_cws**.

### Pipeline

Full extension build layout: [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)

1. `npm ci`
2. `npx vitest run --config config/vitest.config.ts`
3. `EXTENSION_STORE_BUILD=1 npm run build:extension:store` → `dist/extension/`
4. Zip with **manifest.json at archive root** (`cd dist/extension && zip …`)
5. Upload artifact `easysubmit-extension.zip`
6. Publish via `mnao305/chrome-extension-upload@v4.0.1`

Store build strips `localhost` from manifest (Chrome Web Store requirement).

### GitHub repository secrets

Settings → Secrets and variables → Actions:

| Secret | Purpose |
|--------|---------|
| `CHROME_EXTENSION_ID` | Extension ID from Chrome Web Store developer dashboard |
| `CHROME_CLIENT_ID` | Google OAuth client for **CWS Publish API** (not login OAuth) |
| `CHROME_CLIENT_SECRET` | CWS OAuth secret |
| `CHROME_REFRESH_TOKEN` | CWS OAuth refresh token |
| `EXTENSION_POSTHOG_KEY` | Optional — prod **project** key `phc_…` (PostHog 488042), inlined at build time |

`EXTENSION_POSTHOG_KEY` is the **project API key** (`phc_`), not the personal key (`phx_`). See [analytics-option-a.md](./analytics-option-a.md).

### Before every store upload

Bump `version` in `extension/manifest.json`. Chrome Web Store **rejects** duplicate versions.

### Local extension build (no CWS)

See [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md). Quick reference:

```bash
run easy                    # dev → dist/extension-dev/
npm run build:extension:store   # prod / CWS → dist/extension/
cd dist/extension && zip -r ../../easysubmit-extension.zip .
```

---

## Secrets map (where things go)

| Secret / config | Local `.env.local` | Vercel Production | GitHub Actions |
|-----------------|-------------------|-------------------|----------------|
| Dev Supabase `dwccqrbpwbnuoiihpgth` | ✓ | — | — |
| Prod Supabase `yofgnflcqajqsepbfdkc` | — | ✓ | — |
| Login Google/LinkedIn OAuth | ✓ (dev clients) | ✓ (prod clients) | — |
| `NEXTAUTH_*` | ✓ | ✓ | — |
| PostHog `phc_` (web) | ✓ dev 488025 | ✓ prod 488042 | — |
| PostHog `phc_` (extension CI) | — | — | optional `EXTENSION_POSTHOG_KEY` |
| PostHog `phx_` (scripts) | ✓ optional | — | — |
| CWS publish OAuth | — | — | ✓ `CHROME_*` |

---

## Manual commands (reference)

| Command | What it does |
|---------|----------------|
| `run easy` | Local dev — 6-step pipeline (see `ENV.md`) |
| `run easy fast` | Local dev without tests |
| `run easy prod` | Tests → prisma validate → `npx vercel deploy --prod --yes` |
| `run easy prod fast` / `npm run prod:repair` | Deploy only |
| `npm run prod:health` | Ephemeral Vercel env pull → prod DB/migration health check |
| `npm run env:whoami` | Confirm `.env.local` targets dev Supabase (not prod) |

---

## Optional: GitHub CI for web tests only

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs vitest on PR/push. Placeholder `DATABASE_URL`/`DIRECT_URL` are **not** prod secrets.

---

## Related docs

- [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) — **start here if a deploy fails**

- [ENV.md](./ENV.md) — env files and local vs prod variables
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) — local dev injection model
- [PROD_CUTOVER.md](./PROD_CUTOVER.md) — first-time prod DB, OAuth, smoke tests
- [oauth-setup.md](./oauth-setup.md) — Google/LinkedIn redirect URIs
- [analytics-option-a.md](./analytics-option-a.md) — PostHog keys for web and extension
