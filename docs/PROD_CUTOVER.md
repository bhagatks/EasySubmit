# Production cutover checklist

Single checklist for shipping EasySubmit to Vercel. Local dev can use a **different** Supabase project and OAuth clients than production — do not copy `.env.local` wholesale into Vercel.

**Deploy command:** `run easy prod` (see [`ENV.md`](./ENV.md))  
**OAuth setup guide:** [`oauth-setup.md`](./oauth-setup.md)  
**DB migration recovery (P3009):** [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md)

---

## 1. Database (before first prod deploy)

Prod Supabase project: **`yofgnflcqajqsepbfdkc`** (see `.env.vercel.example`).

| Step | Status | Notes |
|------|--------|-------|
| **Unlock P3009 — mark init as applied** | **Do first** | Point `DATABASE_URL` at prod, then: `npx prisma migrate resolve --applied 20260618043606_init` — tables already exist, this just clears the stuck flag |
| Apply remaining migrations | Pending | `npm run db:migrate` — if another migration fails with "already exists", mark it applied too and re-run |
| Verify migration status | Pending | `npx prisma migrate status` must show **Database schema is up to date** |
| Vault SQL functions (`vault_user_key`, etc.) | Verify | Re-apply `scripts/vault-functions-only.sql` if Ignition BYOK fails after migrate |
| Pending migrations after local work | Check | `20260627120000_north_star_jd_skills_enhance_meta`, `20260627140000_extension_install_prompt_config` — confirm committed before deploy |
| Job Tracker Realtime (optional) | QA done locally | Run `scripts/sql/job-tracker-realtime-setup.sql` on prod Supabase if Realtime needed |
| System Gemini keys in vault | Optional | `npm run db:import-system-keys` against prod when using system AI |

> Full P3009 recovery guide: [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md)  
> **Do not** use `migrate reset` on prod — drops data.

---

## 2. Vercel project

| Step | Status | Notes |
|------|--------|-------|
| Connect GitHub repo | Deferred | `bhagatks/EasySubmit` |
| Production domain known | Pending | Needed for `NEXTAUTH_URL` and OAuth redirect URIs |
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
| Prod redirect URI in Google Cloud | **Todo** | `https://<prod-domain>/api/auth/callback/google` |
| Prod JavaScript origin | **Todo** | `https://<prod-domain>` |
| Prod Web client ID + secret in Vercel | **Todo** | Same client can list both local + prod URLs, or use a dedicated prod client |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel | **Todo** | Must match prod client — **not** the localhost-only dev credentials |
| OAuth consent screen | Verify | Publish or add prod test users if still in Testing mode |

Full walkthrough: [`oauth-setup.md`](./oauth-setup.md).

### LinkedIn

| Step | Status | Notes |
|------|--------|-------|
| Prod redirect URI | Verify | `https://<prod-domain>/api/auth/callback/linkedin` |
| Vercel `LINKEDIN_*` vars | Deferred | Previously marked registered — re-verify against live domain |

---

## 5. Supabase storage & infra

| Step | Status | Notes |
|------|--------|-------|
| Storage bucket `avatars` (public read) | Needed | See `lib/profile/avatar-storage.ts` |
| Storage bucket `resumes` | **Cancelled** | PDFs on-demand only — see `APPLICATION_PROFILE.md` |

---

## 6. Deploy

```bash
run easy prod
```

Pipeline: tests → pull prod env from Vercel → `prisma migrate deploy` → `vercel deploy --prod`.

If migrate fails on prod, stop and follow [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) — do not force-deploy with a broken schema.

---

## 7. Post-deploy smoke test

- [ ] `/login` — **Google** OAuth completes → `/onboarding` (or `/dashboard` if onboarding done)
- [ ] `/login` — **LinkedIn** OAuth completes
- [ ] `/onboarding` — wizard / workbench loads
- [ ] Resume upload → dashboard path works
- [ ] Unauthenticated `/dashboard` → `/login`
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
| Autocapture | **Todo** | **On** for web (`NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true`); extension build keeps autocapture off |
| Session replay | **Todo** | **On**, sample ~10–20% |
| Error tracking | **Todo** | **On** |
| Property blocklist | **Todo** | `apiKey`, `password`, `resumeText`, `coverLetter`, `jobDescription`, `token`, … |
| Replay masking | **Todo** | Mask all inputs |

### Vercel Production env

| Step | Status | Notes |
|------|--------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | **Todo** | Prod `phc_…` (project 488042) — never commit to git |
| `NEXT_PUBLIC_POSTHOG_HOST` | **Todo** | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | **Todo** | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | **Todo** | `prod` |
| `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE` | **Todo** | `true` (web dashboard only) |
| `LOG_LEVEL` | **Todo** | `info` |

### After deploy

| Step | Status | Notes |
|------|--------|-------|
| Smoke: Live events on prod login | **Todo** | Filter `environment = prod` |
| Dashboards | Optional | `POSTHOG_PERSONAL_API_KEY=phx_… npm run analytics:setup` |
| Chrome extension prod build | **Todo** | Rebuild with prod `NEXT_PUBLIC_*` before CWS publish |
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
| DB migrations | `run easy` / `db:migrate` on dev DB | `migrate deploy` via `run easy prod` on prod DB |
