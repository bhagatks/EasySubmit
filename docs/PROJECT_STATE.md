# Project State

## Completed

- **NextAuth** — Google + LinkedIn OAuth at `/login`; middleware + layout protect `/onboarding` and `/dashboard`
- **Typed env** — `lib/env.ts`, `types/env.d.ts` for OAuth credentials
- **Login UI** — Google-only OAuth on deep navy glass card (`LogoIcon` w-12, `size="xl"` CTA); `SessionProvider` via `components/providers/auth-provider.tsx`
- **Onboarding hub** — `/onboarding`: 4-phase Unified Workbench (Coordinates → Fuel → Refinery → Calibration); Phase 1 contact-only with country-code phone (default +1), city locate button, Nominatim search; parsed resume contact fields override Phase 1 when present; Fuel locks breadcrumb back to Coordinates; Refinery ATS section order + Upload back to Fuel; `mergeParsedWithCoordinates`; 2.5s calibration → `/dashboard`
- **Resume spec (repo root)** — `EASYSUBMIT_RESUME_RULES.md`, `ATS_Universal_Resume_Template.pdf/.docx`; `lib/resume/resumeSpec.ts`; Fuel panel sample download via `/api/resume/ats-template`
- **Open-Resume parser** — PDF via browser Open-Resume engine; **DOCX → PDF** via `docx-to-pdf-wasm` on `/api/resume/convert-docx`, then same PDF parser; heuristic DOCX fallback if conversion parse fails
- **Onboarding workbench** — `/onboarding` is the default post-login entry: 60/40 split (Coordinates → Fuel → Refinery), full-screen shell (no sidebar); `/onboarding/step-1` and `/onboarding/workbench` redirect here
- **Onboarding flow shell** — asymmetric layout for legacy wizard routes; full-screen bypass for `/onboarding`, `/onboarding/refinery`
- **Resume mapping** — `/onboarding/step-4` + `ResumeMapping` (mint laser, data bits → buckets, LogoIcon zoom success → `/dashboard`)
- **Wizard wiring** — resume upload redirects to step-4; skip path advances to experience
- Full 11-step onboarding wizard with Zustand + sessionStorage persist
- Step 2 locations: Nominatim search + residential home-base (`isResidential`)
- Step 11 survey + Step 12 social proof → `finalizeProfile` → `/dashboard`
- Supabase Auth signup (`/auth/signup`) — legacy email/OAuth path
- `finalizeProfile` — Zustand payload → Prisma Postgres
- Protected `/dashboard` welcome page
- **Profile + Engine models** — `Profile` (1:1 `User`) with `Experience` / `Project` / `Education` / `Certification`; `Engine` for parsed JSON; multi-provider email linking via NextAuth
- Marketing landing (`/`) + extension page (`/extension`)

## Active work

- Production deploy (Vercel) — env vars + OAuth redirect URIs
- Dashboard features (job queue, apply flow)
- Real resume parsing (replace simulation)
- Chrome extension content-script sidebar

## Setup (local)

```bash
cp .env.example .env.local   # fill all vars
npx prisma migrate dev --name init
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel)

1. Connect repo `bhagatks/EasySubmit` to Vercel
2. Set environment variables (see `.env.example`)
3. Set `NEXTAUTH_URL` to production URL (e.g. `https://easysubmit.ai`)
4. Add OAuth redirect URIs:
   - Google: `https://<domain>/api/auth/callback/google`
   - LinkedIn: `https://<domain>/api/auth/callback/linkedin`
5. `npx vercel --prod` or push to main with Vercel Git integration

See `docs/ACTION_ITEMS.md` for checklist.

## Dev

```bash
npm run easy        # dev server
npm run easy:prod   # production build + start
npm run build       # prisma generate + next build
```
