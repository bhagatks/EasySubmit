# Action Items

## Deploy to Vercel

| Step | Status | Notes |
|------|--------|-------|
| Fix production build (`npm run build`) | Done | Extension page + lucide `Github` → `Code2` |
| Connect GitHub repo to Vercel | **Pending** | `bhagatks/EasySubmit` |
| Set production env vars in Vercel | **Pending** | See `.env.vercel.example` (Supabase `yofgnflcqajqsepbfdkc`) |
| Set QA/preview env vars (optional) | **Pending** | Vercel Preview: use dev Supabase vars from `.env.example` |
| Set `NEXTAUTH_URL` to prod domain | **Pending** | Must match deployed URL exactly |
| Google OAuth redirect URI | **Pending** | `https://<domain>/api/auth/callback/google` |
| LinkedIn OAuth redirect URI | **Pending** | `https://<domain>/api/auth/callback/linkedin` |
| Run Prisma migrate on production DB | **Blocked — P3009** | See `docs/MIGRATION_RECOVERY.md` — resolve failed `20260618043606_init`, then `npm run db:migrate` + `scripts/vault-functions-only.sql` if needed |
| Supabase Storage bucket `resumes` | **Pending** | Private, authenticated upload |

## Post-deploy smoke test

- [ ] `/login` — Google OAuth completes → `/onboarding/step-1`
- [ ] `/onboarding` — wizard steps advance
- [ ] Resume upload → `/onboarding/step-4` animation → `/dashboard`
- [ ] Unauthenticated `/dashboard` → `/login`

## Follow-up (not blocking deploy)

- Add `@testing-library/react` harness for onboarding UI (see sidepanel rule pattern)

## Job Tracker & Chrome extension

Full specs: **[`docs/JOB_TRACKER.md`](./JOB_TRACKER.md)** · Workday E2E: **[`docs/WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md)**

| Item | Status |
|------|--------|
| `job_tracker_entries` schema + migrations | Done |
| Dashboard pipeline tracker (pizza bar rows) | Done |
| Review Screen (rename from job review overlay) | Done |
| Archive + auto-archive + delete | Done |
| Dashboard Kanban + list | Removed — replaced by pipeline rows |
| Extension reconnect hint on tracker page | Removed — use extension popup / bridge only |
| Extension API (`/api/extension/jobs`) | Done |
| MV3 extension + in-page card | Done |
| **One-click apply setting** (`users.oneClickApply`) | Done |
| **Pipeline API** (`POST /api/extension/jobs/pipeline`) | Done — capture → tailor → autofill stub → `READY_TO_APPLY` |
| **Autofill complete API** (`POST /api/extension/jobs/[id]/autofill-complete`) | Done (stub) — real Workday fill pending |
| Workday scraper hardening (W1–W10) | Partial — apply URL canonicalize + company fallback |
| Enhance AI in pipeline (Phase B) | Done — B1–B7 (B6 partial: card busy label + polling) |
| Workday autofill port (Phase C) | Partial — stub runner + `READY_TO_APPLY`; field map pending |
| Extension popup one-click toggle | Done |
| Extension reconnect UX in popup/settings | Pending — banner removed from job tracker |
