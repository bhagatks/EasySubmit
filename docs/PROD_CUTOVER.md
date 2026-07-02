# Production cutover checklist

Single checklist for shipping EasySubmit to Vercel. Local dev can use a **different** Supabase project and OAuth clients than production — do not copy `.env.local` wholesale into Vercel.

**Deploy overview (web + extension):** [`DEPLOYMENT.md`](./DEPLOYMENT.md)  
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
| Pending migrations after local work | Check | Confirm committed before deploy — latest: `20260702120000_enable_rls_public_tables` |
| Job Tracker Realtime (optional) | QA done locally | Run `scripts/sql/job-tracker-realtime-setup.sql` on prod Supabase if Realtime needed |
| System Gemini keys in vault | Optional | `npm run db:import-system-keys` against prod when using system AI |

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
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (analytics) | **Prod** PostHog project `488042` — see §8 |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes (analytics) | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Yes (analytics) | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | Yes (analytics) | `prod` |
| `NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS` | Optional | Comma-separated user ids to tag `$internal` |
| `LOG_LEVEL` | Optional | `info` (Pino JSON on Vercel) |

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

## 6. Deploy

**Default (Git-linked):** push to `main` — Vercel auto-builds. No env changes.

**Manual from laptop:**

```bash
run easy prod        # full: tests → prisma validate → deploy
run easy prod fast   # deploy only
```

On Vercel build: `prisma generate` → `migrate deploy` (`DIRECT_URL`) → `next build`.

If migrate fails on prod, stop and follow [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) — do not force-deploy with a broken schema.

---

## 7. Post-deploy smoke test

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

---

## 8. PostHog analytics (prod)

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

## Local vs prod (quick reference)

| | Local (`.env.local`) | Production (Vercel) |
|--|----------------------|---------------------|
| Supabase project | Dev project (your `.env.local`) | `yofgnflcqajqsepbfdkc` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://<prod-domain>` |
| Google OAuth client | Localhost redirect URIs | Prod domain redirect URIs |
| PostHog project | `488025` (dev) | `488042` (prod) |
| `NEXT_PUBLIC_ANALYTICS_ENV` | `dev` | `prod` |
| DB migrations | `run easy` on dev DB | `migrate deploy` on Vercel build (`DIRECT_URL`) or `run easy prod` |
