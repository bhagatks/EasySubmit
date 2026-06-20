# Action Items

## Deploy to Vercel

| Step | Status | Notes |
|------|--------|-------|
| Fix production build (`npm run build`) | Done | Extension page + lucide `Github` → `Code2` |
| Connect GitHub repo to Vercel | **Pending** | `bhagatks/EasySubmit` |
| Set production env vars in Vercel | **Pending** | See `.env.prod.example` (Supabase `yofgnflcqajqsepbfdkc`) |
| Set QA/preview env vars (optional) | **Pending** | See `.env.qa.example` (Supabase `dwccqrbpwbnuoiihpgth`) |
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

- Wire step-4 success to `completeResumeMapping()` if users should continue wizard instead of dashboard
- Remove unused `components/layout/OnboardingLayout.tsx` (superseded by flow shell)
- Add `@testing-library/react` harness for onboarding UI (see sidepanel rule pattern)
