# Production cutover checklist

Single checklist for shipping EasySubmit to production — **web app (Vercel)** and **Chrome extension (Chrome Web Store)**.

**Deploy overview (web + extension):** [`DEPLOYMENT.md`](./DEPLOYMENT.md)  
**Extension launch (dev + prod steps):** [`EXTENSION_LAUNCH_RUNBOOK.md`](./EXTENSION_LAUNCH_RUNBOOK.md)  
**Env domains (DB vs PostHog):** [`rules/env-domains.md`](./rules/env-domains.md)  
**Deploy command (manual):** `run easy prod` (see [`ENV.md`](./ENV.md))  
**OAuth setup guide:** [`oauth-setup.md`](./oauth-setup.md)  
**DB migration recovery (P3009):** [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md)

---

## 1. Database (before first prod deploy)

Prod Supabase project: **`yofgnflcqajqsepbfdkc`** (see `.env.vercel.example`).

| Step | Status | Notes |
|------|--------|-------|
| **Unlock P3009 — mark init as applied** | **Do first** | Point `DATABASE_URL` at prod, then: `npx prisma migrate resolve --applied 20260618043606_init` — tables already exist, this just clears the stuck flag |
| Apply remaining migrations | **Done** (ongoing) | Via Vercel `vercel-build` + `prisma-migrate-deploy.mjs`; pending: `20260702120000_enable_rls_public_tables` (RLS on public tables, no policies) |
| Verify migration status | Pending | `node scripts/run.mjs admin -- npx prisma migrate status` or `npm run prod:health` |
| Vault SQL functions (`vault_user_key`, etc.) | Verify | Re-apply `scripts/vault-functions-only.sql` if Ignition BYOK fails after migrate |
| Pending migrations after local work | Check | Confirm committed before deploy — latest: `20260706203000_extension_cws_live` (CWS URL + install prompt), `20260702120000_enable_rls_public_tables` |
| Job Tracker Realtime (optional) | QA done locally | Run `scripts/sql/job-tracker-realtime-setup.sql` on prod Supabase if Realtime needed |
| System pool keys in vault (OpenRouter slot 0 + DeepSeek slot 1) | **Todo** | `node scripts/run.mjs admin -- npm run db:import-system-keys` — redeploy does **not** update vault rows |
| **Remove legacy `app_config.aiConfig` row** | **Pending** | Run `scripts/sql/remove-legacy-ai-config.sql` on prod Supabase SQL editor — unused since `aiEngine` + `dataRefresh` replaced it (2026-07-06) |

> Full P3009 recovery guide: [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md)  
> **Do not** use `migrate reset` on prod — drops data.

---

## 2. Vercel project

| Step | Status | Notes |
|------|--------|-------|
| Connect GitHub repo | **Done** | `bhagatks/EasySubmit` — auto-deploy on `main` |
| Production domain known | **Done** | `https://www.easysubmit.ai` |
| `npm run build` passes | Done | Fix regressions before deploy |
| `npm test` passes | Required | `run easy prod` runs tests first |

---

## 3. Vercel environment variables (Production)

Checklist from `.env.vercel.example`. Set in **Vercel → Settings → Environment Variables → Production** (not in repo).

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Prod Supabase session pooler URI |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Prod project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Prod anon/publishable key |
| `SUPABASE_JWT_SECRET` | Yes | Realtime + extension tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | For avatars | Prod avatar upload; dev uses `public/avatars/` fallback |
| `NEXTAUTH_URL` | Yes | `https://<prod-domain>` — **no trailing slash** |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` — **prod-only**, not the local dev secret |
| `GOOGLE_CLIENT_ID` | Yes | **Prod OAuth client** (see §4) |
| `GOOGLE_CLIENT_SECRET` | Yes | Matching prod client secret |
| `LINKEDIN_CLIENT_ID` | Yes | Prod LinkedIn app |
| `LINKEDIN_CLIENT_SECRET` | Yes | Prod LinkedIn app |
| `EASYSUBMIT_SYSTEM_GEMINI_API_KEYS` | Optional | Prefer vault import on prod |
| `EXTENSION_TOKEN_SECRET` | Optional | Falls back to `NEXTAUTH_SECRET` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (analytics) | **Prod** PostHog project `488042` — see §9 |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes (analytics) | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Yes (analytics) | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | Yes (analytics) | `prod` |
| `NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS` | Optional | Comma-separated user ids to tag `$internal` |
| `LOG_LEVEL` | Optional | `info` (Pino JSON on Vercel) |
| `ONET_API_KEY` | Yes (enhance) | O*NET Web Services v2 — My Account → project → API key; powers Role Skills Framework (`pre_role_vocab`) |

Preview/QA env (optional): separate vars pointing at dev Supabase — see `ACTION_ITEMS.md`.  
Preview PostHog: use **dev** project `488025` and `NEXT_PUBLIC_ANALYTICS_ENV=dev`.

---

## 4. OAuth — **must fix for prod**

Local Google OAuth was recreated (June 2026) for `http://localhost:3000` only. **Production is not covered** until the steps below are done.

### Google (required)

| Step | Status | Notes |
|------|--------|-------|
| Prod redirect URI in Google Cloud | **Done** | `https://www.easysubmit.ai/api/auth/callback/google` |
| Prod JavaScript origin | **Done** | `https://www.easysubmit.ai` |
| Prod Web client ID + secret in Vercel | **Done** | Prod smoke test Jul 2026 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel | **Done** | Must match prod client — **not** the localhost-only dev credentials |
| OAuth consent screen | Verify | Publish or add prod test users if still in Testing mode |

Full walkthrough: [`oauth-setup.md`](./oauth-setup.md).

### LinkedIn

| Step | Status | Notes |
|------|--------|-------|
| Prod redirect URI | **Done** | `https://www.easysubmit.ai/api/auth/callback/linkedin` |
| Vercel `LINKEDIN_*` vars | **Done** | Prod smoke test Jul 2026 |

---

## 5. Supabase storage & infra

| Step | Status | Notes |
|------|--------|-------|
| Storage bucket `avatars` (public read) | **Done** | Bucket exists on prod (`public=true`) |
| Storage bucket `resumes` | **Cancelled** | PDFs on-demand only — see `APPLICATION_PROFILE.md` |

---

## 6. Deploy web app (Vercel)

EasySubmit web and extension use **separate deploy paths** — web goes to Vercel; the store bundle goes through GitHub Actions (§7). Both can ship from the same merge to `main`.

### 6.1 Pre-deploy

- [ ] Changes merged to `main` (or deploy branch)
- [ ] `npm run build` passes locally
- [ ] `npx vitest run --config config/vitest.config.ts` passes (or use `run easy prod` which runs tests)
- [ ] Pending migrations committed — see §1 (`20260706203000_extension_cws_live`, `20260702120000_enable_rls_public_tables`, …)

### 6.2 Deploy

**Default (Git-linked):**

```bash
git push origin main    # Vercel auto-builds Production — no env file changes
```

**Manual from laptop:**

```bash
run easy prod           # tests → prisma validate → vercel deploy --prod
run easy prod fast      # deploy only (skip tests)
```

**Vercel build pipeline:** `prisma generate` → `migrate deploy` (`DIRECT_URL`) → `next build`.

If migrate fails, stop and follow [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) — do not force-deploy with a broken schema.

### 6.3 Post web-deploy verify

```bash
npm run prod:health
node scripts/run.mjs admin -- npx prisma migrate status
```

**If extension migration rows missing** (CWS URL / install prompt), run on prod Supabase SQL editor:

```text
scripts/sql/extension-cws-live.sql
```

(Same SQL as migration `20260706203000_extension_cws_live` — safe to re-run.)

---

## 7. Deploy Chrome extension (Chrome Web Store)

**Listing:** [EasySubmit.ai — Job Tracker](https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc)  
**Extension ID (CWS):** `ondcaafebdfegfkmdggeklofnmbijmlc`  
**Workflow:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)  
**Dev vs prod detail:** [`EXTENSION_LAUNCH_RUNBOOK.md`](./EXTENSION_LAUNCH_RUNBOOK.md)

Deploy the **web app first** (§6) when changes touch shared API, auth, or `src/shared/` used by the dashboard. Extension-only UI changes can publish without a Vercel deploy.

### 7.1 One-time — GitHub Actions secrets

Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|--------|
| `CHROME_EXTENSION_ID` | `ondcaafebdfegfkmdggeklofnmbijmlc` |
| `CHROME_CRX_PRIVATE_KEY` | Full PEM (`easysubmit_private.pem` contents) |
| `CHROME_CLIENT_ID` | CWS Publish API OAuth client (**not** login OAuth) |
| `CHROME_CLIENT_SECRET` | Matching secret |
| `CHROME_REFRESH_TOKEN` | CWS OAuth refresh token |
| `EXTENSION_POSTHOG_KEY` | Optional — prod `phc_…` (PostHog project `488042`) |

Login Google/LinkedIn OAuth stays in **Vercel only** — never put CWS OAuth in Vercel.

### 7.2 Every extension release

| Step | Action |
|------|--------|
| 1 | **Bump version** in `extension/manifest.json` (e.g. `1.0.8` → `1.0.9`) — CWS rejects duplicate versions |
| 2 | Commit + push to `main` (if not already) |
| 3 | GitHub → **Actions** → **Chrome Extension — Chrome Web Store** → **Run workflow** |
| 4 | Check **`publish_to_cws`** |
| 5 | Wait for green run; optional: download `easysubmit-extension.crx` from workflow artifacts |

Push to `main` that touches `extension/**` or `src/shared/**` also **builds** artifacts on push but does **not** publish unless you run the workflow manually with `publish_to_cws`.

**Local pack (optional, no upload):**

```bash
npm run package:extension:store   # easysubmit-extension.crx + .zip at repo root
```

### 7.3 Force-upgrade old clients (optional)

After a breaking extension release, block builds below your published version:

```sql
UPDATE app_config
SET value = jsonb_set(
  jsonb_set(value, '{enabled}', 'true'),
  '{minVersion}', '"1.0.9"'   -- match published manifest version
)
WHERE key = 'forceUpgrade';
```

Old clients see an in-card **Update** banner; `updateUrl` points at the CWS listing (set by migration `20260706203000_extension_cws_live`).

---

## 8. Post-deploy smoke test

### Web app

```bash
npm run prod:smoke
npm run prod:verify-posthog
npm run prod:health
npm run analytics:closeout    # optional — phx_ in .env.local; PostHog only (see rules/env-domains.md)
```

- [x] `/login` — **Google** OAuth completes → `/onboarding` (or `/dashboard` if onboarding done)
- [x] `/login` — **LinkedIn** OAuth completes
- [x] `/onboarding` — wizard / workbench loads
- [x] Resume upload → dashboard path works
- [x] Unauthenticated `/dashboard` → `/login`
- [ ] Ignition / BYOK validate + save (confirms vault migration)
- [ ] Avatar upload on prod (if `avatars` bucket + service role configured)
- [ ] PostHog Live events — `login_completed` after prod OAuth (project `488042`)
- [ ] PostHog replay — confirm login/onboarding session records (inputs masked)
- [x] **O*NET role vocabulary** — `ONET_API_KEY` set in Vercel Production; extension Apply → pipeline debug step **`pre_role_vocab`** shows `source: api` (or `cache`) with occupation code + skills/tools — not `source: fallback` (verified 2026-07-06)

### Chrome extension (live CWS install)

Run after §6 web deploy **and** §7 CWS publish. Use a **clean Chrome profile** — install from the store, not unpacked dev.

**CWS install ID:** `ondcaafebdfegfkmdggeklofnmbijmlc` (not your local unpacked dev id)

- [ ] Migration `20260706203000_extension_cws_live` applied (`npm run prod:health`)
- [ ] Dashboard **Get extension** / install modal opens [CWS listing](https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc)
- [ ] Sign in at `https://www.easysubmit.ai` → **Connect extension** (or `/extension/bridge?extensionId=ondcaafebdfegfkmdggeklofnmbijmlc`) → **Extension connected**
- [ ] Popup shows connected email; **Show job card** works on a job page
- [ ] **Save to tracker** → row on `/dashboard/job-tracker`
- [ ] Tailor → Review Screen; keyword gap chips when `READY_TO_APPLY`
- [ ] PostHog prod (`488042`) — extension events with `environment: prod`

---

## 9. PostHog analytics (prod)

Full spec: [`analytics-option-a.md`](./analytics-option-a.md). Code is shipped; **you still configure keys and PostHog UI**.

### PostHog Cloud (project `488042`)

| Step | Status | Notes |
|------|--------|-------|
| Prod project exists | Done | ID `488042`, US Cloud |
| Autocapture | **Script** | `npm run analytics:closeout` — or set `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true` in Vercel |
| Session replay | **Script** | Prod 15% sample via `analytics:configure` |
| Error tracking | **Script** | `autocapture_exceptions_opt_in` via `analytics:configure` |
| Property blocklist | **Done** | Client: `sanitize.ts`; server script sets `data_attributes` blocklist |
| Replay masking | **Script** | `maskAllInputs` via `analytics:configure` |

### Vercel Production env

| Step | Status | Notes |
|------|--------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | **Done** | Prod project `488042` — set via `npm run prod:repair-analytics` or Vercel dashboard |
| `NEXT_PUBLIC_POSTHOG_HOST` | **Done** | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | **Done** | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | **Done** | `prod` |
| `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE` | **Done** | `true` (web dashboard only) |
| `LOG_LEVEL` | **Done** | `info` |

### After deploy

| Step | Status | Notes |
|------|--------|-------|
| Smoke: Live events on prod login | **Done** | `$pageview` + OAuth smoke verified Jul 2026 |
| Dashboards | **Script** | `npm run analytics:closeout` (needs `POSTHOG_PERSONAL_API_KEY`) |
| Chrome extension prod build | **Done** | Extension CI success on latest `main` push |
| Privacy policy copy | Deferred | PostHog/replay disclosure — [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) Phase C |
| EU cookie consent | Deferred | Evaluate if EU users — [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) Phase C |

### Local dev (do first — before prod)

Use **dev** project `488025` in `.env.local` (same var names, `NEXT_PUBLIC_ANALYTICS_ENV=dev`). See [`analytics-option-a.md`](./analytics-option-a.md) § Setup checklist.

---

## 10. Local vs prod (quick reference)

| | Local (`.env.local`) | Production (Vercel + CWS) |
|--|----------------------|---------------------------|
| Supabase project | Dev project (your `.env.local`) | `yofgnflcqajqsepbfdkc` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://www.easysubmit.ai` |
| Google OAuth client | Localhost redirect URIs | Prod domain redirect URIs |
| PostHog project | `488025` (dev) | `488042` (prod) |
| `NEXT_PUBLIC_ANALYTICS_ENV` | `dev` | `prod` |
| DB migrations | `run easy` on dev DB | `migrate deploy` on Vercel build (`DIRECT_URL`) or `run easy prod` |
| Extension install | Load unpacked → `dist/extension-dev` | [Chrome Web Store listing](https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc) |
| Extension connect id | Your id from `chrome://extensions` | `ondcaafebdfegfkmdggeklofnmbijmlc` |
| Extension publish | Never — dev only | GitHub Actions → `publish_to_cws` (§7) |
