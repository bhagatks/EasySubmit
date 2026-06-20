# Project State

## Completed

- **KeyProtector** — `app/dashboard/layout.tsx` only; when `isLocked`, full-screen Ignition Gate slides over **dashboard** routes (not landing/onboarding)
- **Ignition Gate UI** — `src/components/auth/IgnitionGate.tsx`: `ProviderFuelSelect` dropdown for 6 BYOK providers with Lucide icons; scanning-beam validation; cache skip via `lastDiscovery`; Launch/Resume gated on `isIgnitionComplete()`
- **Dashboard gate** — `components/dashboard/DashboardIgnitionGuard.tsx` redirects to `/onboarding?ignition=1` when BYOK is missing after rehydration (fresh browser / cleared storage); `KeyProtector` overlay reserved for provider auth failures during active use
- **Ignition store** — `src/stores/use-ignition-store.ts`: `unlock`/`lock`/`setActiveModel`; `provider` + `activeModel` in `localStorage`; BYOK `apiKey` AES-GCM encrypted in `sessionStorage` only; `restoreIgnitionFromSession` repopulates `availableModels` from model cache on reload
- **AppConfig** — `src/lib/config/app.config.ts`: `PROVIDER_REGISTRY` (6 providers with `baseUrl` + `handshakeEndpoint`) + `SYSTEM_DEFAULTS`; `ai-config.ts` re-exports for backward compatibility
- **AI config layer** — `model-discovery.ts`, `model-cache.ts`, `career-grade-models.ts` consume `app.config.ts`; BYOK discovery via `app/actions/ai/discovery.ts`
- **NextAuth** — Google + LinkedIn OAuth at `/login`; middleware + layout protect `/onboarding` and `/dashboard`
- **Typed env** — `lib/env.ts`, `types/env.d.ts` for OAuth credentials
- **Login UI** — Google-only OAuth on deep navy glass card (`LogoIcon` w-12, `size="xl"` CTA); `SessionProvider` via `components/providers/auth-provider.tsx`
- **Sign out** — `components/auth/SignOutButton.tsx` + `lib/auth/sign-out-client.ts`; available on all onboarding routes via `OnboardingFlowShell`; clears Zustand onboarding/ignition storage then NextAuth `signOut` → `/login`
- **Onboarding hub** — `/onboarding`: 4-phase Unified Workbench (Identity → Import → Studio → Launch); Phase 1 Identity with **target role** autocomplete (`src/lib/constants/roles.ts`), Zustand `identity.targetRole` + `identityPhaseComplete` gate (no languages in Identity); **Languages** at bottom of Phase 3 Studio right panel (`LanguagesField` — same section styling as Projects/Certifications, Headless UI autosuggest + proficiency); live Languages section on left `PrimeResume` canvas in Studio (name + proficiency per resume rules); country-code phone (default +1), city locate button, Nominatim search; parsed resume contact fields override Phase 1 when present; Import locks breadcrumb back to Identity; Studio skill picker in right panel only (left canvas ATS comma-block skills from import until Launch); `mergeParsedWithCoordinates`; 2.5s calibration → `/dashboard`
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
- **Dashboard shell** — `/dashboard`: Lovable-derived sidebar layout (`DashboardShell`), overview with stats/recent applications/ATS Guarantee (`DashboardOverview`); **Resume profiles** at `/dashboard/resume-profiles` (default profile card); nav stubs for Applications, AI Keys, Settings; BYOK pill when ignition complete; `KeyProtector` for auth-failure re-lock only
- **Login identity** — `users.firstName` / `users.lastName` extracted at OAuth; session + onboarding Identity prefill; resume edits no longer write `users`
- **Profile + Engine models** — `Profile` (1:1 `User`) with `Experience` / `Project` / `Education` / `Certification`; `Engine` for parsed JSON; multi-provider email linking via NextAuth
- Marketing landing (`/`) + extension page (`/extension`)

## Active work

- Production deploy (Vercel) — env vars + OAuth redirect URIs
- Dashboard data wiring (real stats, applications from Prisma)
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
