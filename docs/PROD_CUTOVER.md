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
| Resolve failed Prisma migration (P3009) | **Blocked** | [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) — init migration stuck as failed |
| `prisma migrate deploy` on prod DB | Pending | Runs automatically in `run easy prod` after Vercel env pull |
| Verify `npx prisma migrate status` | Pending | Must show **Database schema is up to date** |
| Vault SQL functions (`vault_user_key`, etc.) | Verify | Re-apply `scripts/vault-functions-only.sql` if Ignition BYOK fails |
| Pending migrations after local work | Check | e.g. `20260626150000_ai_preference_disabled_default` — ensure committed migrations exist before deploy |
| Job Tracker Realtime (optional) | QA done locally | Run `scripts/sql/job-tracker-realtime-setup.sql` on **prod** Supabase if Realtime needed |
| System Gemini keys in vault | Optional | `npm run db:import-system-keys` against prod when using system AI |

**Do not** run `migrate resolve --applied` on prod without confirming the DB already matches that migration (see recovery doc).

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

Preview/QA env (optional): separate vars pointing at dev Supabase — see `ACTION_ITEMS.md`.

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

---

## Local vs prod (quick reference)

| | Local (`.env.local`) | Production (Vercel) |
|--|----------------------|---------------------|
| Supabase project | Dev project (your `.env.local`) | `yofgnflcqajqsepbfdkc` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://<prod-domain>` |
| Google OAuth client | Localhost redirect URIs | Prod domain redirect URIs |
| DB migrations | `run easy` / `db:migrate` on dev DB | `migrate deploy` via `run easy prod` on prod DB |
