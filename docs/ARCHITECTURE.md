# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Primary entry after login: `/onboarding/step-1`. Marketing site at `/`.

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Marketing | Next.js 14, Tailwind, dark-first tokens | `/` |
| Web onboarding | Next.js, Framer Motion, Zustand | `/onboarding` (workbench); `/onboarding/refinery` (legacy full-screen); `/onboarding/step-4` (AI mapping) |
| Auth login | NextAuth (Google + LinkedIn OAuth) | `/login` → `/api/auth/[...nextauth]` |
| Auth signup | Supabase Auth (legacy path) | `/auth/signup` |
| Dashboard | NextAuth-protected | `/dashboard` |
| Extension landing | Static marketing | `/extension` |
| Chrome extension | MV3 + content-script sidebar (planned) | TBD |

## Auth & route protection

- **`middleware.ts`** — Auth gate: anonymous → `/` + `/login` only; logged-in `onboardingStep < 4` → `/onboarding`; `onboardingStep >= 4` → `/dashboard` allowed (JWT via NextAuth)
- **`lib/supabase/`** — `client.ts`, `server.ts`, `middleware.ts` (`@supabase/ssr`); keys via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`app/onboarding/layout.tsx`** — server session check + `OnboardingFlowShell`
- **`lib/auth.ts`** — NextAuth options; post-login redirect → `/onboarding/step-1`
- **`lib/env.ts`** + **`types/env.d.ts`** — typed OAuth / NextAuth env vars

## Directory map

```
app/
  api/auth/[...nextauth]/   NextAuth handler
  login/                    OAuth sign-in UI
  onboarding/
    layout.tsx              Auth gate + flow shell
    page.tsx                Full wizard
    step-1/page.tsx         Wizard entry (post-login)
    step-4/page.tsx         ResumeMapping scanner
  dashboard/                Protected welcome
components/
  onboarding/
    OnboardingFlowShell.tsx Asymmetric layout + 4-phase progress
    OnboardingWizard.tsx    Session-driven 4-step wizard (`onboardingStep`)
    Step1Profile.tsx        Target job title + desired salary
    Step4Mapping.tsx        AI resume mapping animation
  ui/button.tsx             shadcn-style variants (hero, mint, xl)
lib/
  auth.ts                   NextAuth config
  env.ts                    Server env validation
  supabase/                 SSR clients + session refresh helper
  onboarding/phases.ts      Macro phase mapping (Profile → AI Mapping)
middleware.ts               Supabase session refresh + NextAuth route protection
docs/                       System of record
```

## Onboarding flow

### Layout (`OnboardingFlowShell`)

- Deep navy background (`oklch(0.16 0.04 268)`)
- Desktop: progress panel (left) + glass content card (right)
- Mobile: progress stacked above content
- **4 macro phases:** Profile → Experience → Goals → AI Mapping
- Step transitions: Framer Motion `AnimatePresence` via `OnboardingStepTransition`

### Wizard (`OnboardingWizard`)

Driven by `session.user.onboardingStep` (JWT + `completeStep` / `updateUserOnboarding`).

| Step | Component | Data / action |
|------|-----------|----------------|
| 1 | `Step1Profile` | `selectedRole`, `minSalary` → `completeStep(1)` |
| 2 | `Step3Locations` | `targetLocations[]` → `completeStep(2)` |
| 3 | `Step4ResumeUpload` | resume file / skip → `completeStep(3)` |
| 4 | `Step4Mapping` | electric-blue scan → Experience / Skills / Contact buckets → verified seal → `completeStep(4)` → `/dashboard` |

Framer Motion: `OnboardingStepTransition` + per-step fade/blur on step change.

### AI mapping (step 4)

`Step4Mapping`: horizontal electric-blue scan (`oklch(0.62 0.21 265)`) over resume preview (3s); data snippets fly into Experience / Skills / Contact buckets → `LogoIcon` verified seal → `completeStep(4)` → `router.push('/dashboard')`.

## Design system

Dark-first Trust Tech palette in `app/globals.css`: deep navy, electric primary `oklch(0.62 0.21 265)`, mint accent `oklch(0.82 0.16 165)`. Typography: Space Grotesk (`font-display`), DM Sans (`font-sans`). Global radius 12px (`rounded-xl`).

## Changelog

| Date | Summary |
|------|---------|
| 2026-06-19 | Onboarding Identity: country-code phone selector (default US +1, `lib/phone/*`); `CityStateField` locate button (geolocation + Nominatim reverse); parsed resume contact fields override Phase 1 in `mergeParsedWithCoordinates` |
| 2026-06-19 | Phone required in Coordinates/Refinery; `/api/resume/*` exempt from onboarding middleware redirect; DOCX→PDF via `docx-to-pdf-wasm` then Open-Resume PDF pipeline; ATS template download fix |
| 2026-06-19 | Onboarding hub: Phase 1 Coordinates contact-only; Fuel no-back-to-Phase-1; Refinery ATS section order + Upload back; `hubResume.mergeParsedWithCoordinates`; `PrimeResume` matches EASYSUBMIT_RESUME_RULES section order |
| 2026-06-18 | `/onboarding` 4-phase Unified Workbench: Coordinates → Fuel → Refinery → Calibration (2.5s neural map + dashboard); Refinery reorder/hide; scrollable PrimeResume paper |
| 2026-06-18 | `/onboarding` hub panels: Coordinates (profile → paper), Fuel (`parseResumeAction` + `ScanningBeam`), Refinery (`react-hook-form` + `watch` illusion); Finalize → 2s `CalibrationPulse` → `/dashboard` |
| 2026-06-18 | `/onboarding` hub: client 4-step wizard (`step` + `resumeData` state); 60/40 split (`oklch(0.16 0.04 268)` canvas + Pearl White paper); left `PrimeResume` always mounted; right panel steps Coordinates → Fuel → Refinery → Calibration; `lg` breakpoint |
| 2026-06-19 | Phase 1 PDF parser parity: Open-Resume pipeline runs **in the browser** (`readPdfClient` + `pdf.worker.entry`); Fuel/Workbench use `parseResumeFile`; server action DOCX-only interim |
| 2026-06-18 | `/onboarding/workbench`: 60/40 split — left `PrimeResume` canvas + `ScanningBeam`; right Engine Tuning steps (Coordinates → Fuel → Refinery) with Framer Motion; `parseResumeAction` on upload |
| 2026-06-18 | `/onboarding/refinery`: full-screen workbench — no sidebar; 4px primary progress bar; `PrimeResume` + ghost scan; Engine Tuning panel (`react-hook-form` + `watch`) |
| 2026-06-18 | `StepRefinery`: 60/40 split viewer + react-hook-form tuning pane; tag clouds, experience/project cards, mint verified badges |
| 2026-06-18 | `StepCalibration`: scanning beam + tag nodes → Logo; `completeOnboarding` during animation; "Systems Prime" → `/dashboard`; completion at `onboardingStep === 4` |
| 2026-06-18 | Onboarding flow 4 steps: Coordinates → Fuel → Refinery → Calibration |
| 2026-06-18 | `OnboardingWizard`: useReducer state machine; Step 1 Coordinates (title, salary, glass Work Mode menu) → Fuel → Calibration |
| 2026-06-18 | Prisma: `Profile` model (1:1 `User`) + `Experience` / `Project` / `Education` / `Certification`; career fields moved off `User`; `onboardingStep` default `0` |
| 2026-06-18 | NextAuth: email account linking, `signIn` syncs `lastAuthProvider` + `Profile`; session exposes `userId` + `onboardingStep` |
| 2026-06-18 | Prisma: onboarding fields on `User`; `Engine` model for parsed resume; removed `UserProfile` job-search columns |
| 2026-06-18 | `OnboardingWizard`: session-driven 4-step flow (`Step1Profile` → locations → resume → `Step4Mapping`) |
| 2026-06-18 | Middleware: `onboardingStep < 4` → `/onboarding`; dashboard requires `onboardingStep === 4` exactly |
| 2026-06-18 | `/onboarding/step-4`: `Step4Mapping` electric-blue scanner, verified seal, auto `completeStep(4)` → dashboard |
| 2026-06-17 | Supabase SSR helpers (`lib/supabase/`); middleware refreshes sessions + NextAuth gate |
| 2026-06-17 | Docs refresh; resume upload → `/onboarding/step-4`; build fixes; deploy checklist |
| 2026-06-17 | `/onboarding/step-4`: `ResumeMapping` scanner (mint laser, data bits → buckets, success → dashboard) |
| 2026-06-17 | Onboarding flow shell: asymmetric 4-phase progress + AnimatePresence transitions |
| 2026-06-17 | NextAuth middleware, typed `lib/env.ts`, `/login` UI, post-login → `/onboarding/step-1` |
| 2026-06-15 | Initial onboarding wizard, Supabase signup, Prisma `finalizeProfile`, dashboard |
