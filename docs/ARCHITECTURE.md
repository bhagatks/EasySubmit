# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Primary entry after login: `/onboarding/step-1`. Marketing site at `/`.

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Marketing | Next.js 14, Tailwind, dark-first tokens | `/` |
| Web onboarding | Next.js, Framer Motion, Zustand | `/onboarding`, `/onboarding/step-1` (wizard); `/onboarding/step-4` (AI mapping) |
| Auth login | NextAuth (Google + LinkedIn OAuth) | `/login` → `/api/auth/[...nextauth]` |
| Auth signup | Supabase Auth (legacy path) | `/auth/signup` |
| Dashboard | NextAuth-protected | `/dashboard` |
| Extension landing | Static marketing | `/extension` |
| Chrome extension | MV3 + content-script sidebar (planned) | TBD |

## Auth & route protection

- **`middleware.ts`** — Supabase `updateSession` on all matched routes; NextAuth JWT gate on `/onboarding/*` and `/dashboard/*` → `/login`
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
    OnboardingWizard.tsx    11-step client wizard
    ResumeMapping.tsx       AI scanner animation
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

### Wizard micro-steps (`OnboardingWizard`)

| # | Component | Data |
|---|-----------|------|
| 1 | `Step1Timeline` | `jobTimeline` |
| 2 | `Step3Locations` | `targetLocations[]` |
| 3 | `Step4ResumeUpload` | `resumeFile` → redirects to `/onboarding/step-4` |
| 6 | `Step7Experience` | `experienceLevels[]` |
| 7 | `Step8Roles` | `selectedRole` |
| 8 | `Step9Salary` | `minSalary` |
| 9 | `Step10Matches` | preview |
| 10 | `Step11Survey` | `referralSource` |
| 11 | `Step12SocialProof` | finalize → `/dashboard` |

Skip resume → `completeResumeMapping()` advances to experience (step 6).

### AI mapping (`/onboarding/step-4`)

`ResumeMapping`: vertical mint laser scan over resume preview (~3s) with status messages → `LogoIcon` success reveal (“Profile Intelligence Verified”) → hero CTA to `/dashboard`.

## Design system

Dark-first Trust Tech palette in `app/globals.css`: deep navy, electric primary `oklch(0.62 0.21 265)`, mint accent `oklch(0.82 0.16 165)`. Typography: Space Grotesk (`font-display`), DM Sans (`font-sans`). Global radius 12px (`rounded-xl`).

## Changelog

| Date | Summary |
|------|---------|
| 2026-06-17 | Supabase SSR helpers (`lib/supabase/`); middleware refreshes sessions + NextAuth gate |
| 2026-06-17 | Docs refresh; resume upload → `/onboarding/step-4`; build fixes; deploy checklist |
| 2026-06-17 | `/onboarding/step-4`: `ResumeMapping` scanner (mint laser, data bits → buckets, success → dashboard) |
| 2026-06-17 | Onboarding flow shell: asymmetric 4-phase progress + AnimatePresence transitions |
| 2026-06-17 | NextAuth middleware, typed `lib/env.ts`, `/login` UI, post-login → `/onboarding/step-1` |
| 2026-06-15 | Initial onboarding wizard, Supabase signup, Prisma `finalizeProfile`, dashboard |
