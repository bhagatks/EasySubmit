# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Primary entry after login: `/onboarding/step-1`. Marketing site at `/`.

## Data model

Postgres (Prisma) + Supabase Vault BYOK + client Zustand stores. Login identity (`users`) is separate from career data (`profiles` + nested rows) and engine state (`architectures` JSONB). Diagrams, entity map, and feature mapping: [`docs/database-schema.md`](./database-schema.md#data-model-overview). Boot and routing rules: [`docs/IDENTITY_AND_BOOT_RULES.md`](./IDENTITY_AND_BOOT_RULES.md).

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Marketing | Next.js 14, Tailwind, dark-first tokens | `/` |
| Web onboarding | Next.js, Framer Motion, Zustand | `/onboarding` (workbench); `/onboarding/refinery` (legacy full-screen); `/onboarding/step-4` (AI mapping) |
| Auth login | NextAuth (Google + LinkedIn OAuth) | `/login` → `/api/auth/[...nextauth]` |
| Auth signup | Supabase Auth (legacy path) | `/auth/signup` |
| Dashboard | NextAuth-protected shell + sidebar nav | `/dashboard` (+ `/dashboard/resume-profiles`, `/applications`, `/keys`, `/settings`) |
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
  dashboard/
    layout.tsx              KeyProtector + sidebar shell
    page.tsx                Overview (stats, recent apps, ATS guarantee)
    resumes/                Placeholder
    applications/           Placeholder
    keys/                   Placeholder
    settings/               Placeholder
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
src/lib/config/
  app.config.ts             SERVICE_REGISTRY + SYSTEM_DEFAULTS — AI single source of truth
  ai-config.ts              Legacy re-exports from app.config
  career-grade-models.ts    Career-grade filter for Ignition Gate model picker
  model-discovery.ts        Live model list fetch per provider API
  model-cache.ts            In-memory + localStorage model catalog cache
app/actions/ai/
  discovery-service.ts      Server action — BYOK handshake + ENGINE_ERRORS
  discovery.ts              Legacy wrapper → discovery-service
src/lib/ai/
  discovery-service.ts      Handshake orchestration + career-grade gate
  engine-errors.ts          ENGINE_ERRORS + JetBrains Mono terminalLine formatter
stores/
  ignitionStore.ts          Deprecated re-export → src/stores/use-ignition-store.ts
src/stores/
  use-ignition-store.ts     Ignition BYOK state (isLocked, encrypted apiKey, activeModel)
src/components/auth/
  IgnitionGate.tsx          Full-screen OKLCH cinematic BYOK gate (terminal + discovery list)
  KeyProtector.tsx          Dashboard-only overlay when isLocked (via app/dashboard/layout)
components/dashboard/
  DashboardShell.tsx          Sidebar layout (Workspace nav + extension CTA)
  DashboardOverview.tsx       Post-onboarding overview cards
  DashboardFuelBadge.tsx      BYOK active pill when ignition complete
  DashboardIgnitionGuard.tsx  Redirects to /onboarding?ignition=1 when BYOK missing; KeyProtector for auth failures only
components/ui/
  sidebar.tsx                 shadcn sidebar (collapsible, mobile sheet)
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
| 2026-06-19 | `docs/database-schema.md`: data model overview — ER diagram, end-to-end flow diagram, feature→table mapping; `ARCHITECTURE.md` links to overview |
| 2026-06-19 | Dashboard AI Keys (`/dashboard/keys`): lists vaulted BYOK per provider, edit/add via embedded Ignition Gate, multi-key + set active |
| 2026-06-19 | Dashboard overview wired to Headless Engine: `getDashboardStats`, `Overview.tsx` (60/40 canvas, Engine Cold, verification from Architecture JSONB, BYOK mint badge) |
| 2026-06-19 | `executeEngineRefinement` (`app/actions/ai/engine.ts`): vault decrypt → Vercel AI SDK Career Architecture refinement → `saveUsageLog`; `VAULT_LOCK` triggers Ignition Gate |
| 2026-06-19 | Gemini BYOK: AutoApply-style `@google/generative-ai` ping (`gemini-1.5-flash`, 1 token) + optional REST model enrich |
| 2026-06-19 | Headless Engine schema: `Architecture` (replaces `Engine`), `UsageLog` ledger, `User.vaultKeyId` + `activeProvider` pointers; Career Architecture stores state, not secrets |
| 2026-06-19 | Supabase Vault BYOK: `user_api_keys` + `vault_user_key` / `unvault_user_key` / `revoke_user_key` SQL functions; `lib/vault/user-key-vault.ts` + `app/actions/ai/vault-key.ts` for server-side key persistence |
| 2026-06-19 | Login identity: `users.firstName` / `users.lastName` extracted at OAuth (`lib/auth/extract-login-identity.ts`); session exposes split names; onboarding Coordinates prefill from login profile |
| 2026-06-19 | Identity & boot rules: `docs/IDENTITY_AND_BOOT_RULES.md` — login (`users`) vs resume profile (`profiles`) separation, PKs, OAuth gate, app-load resolver; dashboard nav **Resume profiles** at `/dashboard/resume-profiles` |
| 2026-06-19 | Dashboard BYOK gate: missing local API key after sign-in redirects to `/onboarding?ignition=1` instead of Key Protector overlay; middleware allows `?ignition=1` for completed onboarding users |
| 2026-06-19 | Onboarding sign out: `SignOutButton` in `OnboardingFlowShell` (full-screen top-right + legacy sidebar footer); `lib/auth/sign-out-client.ts` clears onboarding/ignition client storage then NextAuth `signOut` → `/login` |
| 2026-06-19 | Dashboard ignition guard: `restoreIgnitionFromSession` rebuilds model catalog from cache after persist rehydration; guard waits for `_hasHydrated` so valid session keys are not cleared on every `/dashboard` visit |
| 2026-06-19 | `PROVIDER_REGISTRY` expanded to 6 BYOK providers (OpenAI, Anthropic, Gemini, Groq, DeepSeek, OpenRouter) with `handshakeEndpoint`; Ignition Gate provider dropdown + Lucide icons; discovery handshake routes per provider | `getAppConfig("dataRefresh")` interval + `localStorage.lastDiscovery` skip live handshake when cache is fresh; uses `model-cache` catalog for fast Launch |
| 2026-06-19 | `app_config` table + `prisma/seed.ts`: upserts `dataRefresh` and `aiConfig` defaults on deploy (`prisma db seed`) |
| 2026-06-19 | Dashboard UI from Lovable bundle: `DashboardShell` sidebar (Overview, Resumes, Applications, AI Keys, Settings), overview stats/recent applications/ATS Guarantee cards; sub-routes stubbed; personalized greeting from session |
| 2026-06-19 | `src/components/auth/IgnitionGate.tsx`: full-screen deep navy OKLCH gate with scanning-beam validation, System Log + `ClipboardButton`, mint-pulse Discovery List; `KeyProtector` + `DashboardIgnitionGuard` hide dashboard until `isLocked` is false |
| 2026-06-19 | `discovery-service` server action: provider models handshake, strict career-grade validation, `ENGINE_ERRORS` terminal lines (`INVALID_KEY`, `INSUFFICIENT_QUOTA`, `NO_CAREER_MODELS`) |
| 2026-06-19 | Launch phase `IgnitionGate`: terminal BYOK entry → sliding drawer model config (JetBrains Mono, mint Recommended badge); Launch to Dashboard gated on validated key + Primary Fuel |
| 2026-06-19 | Ignition Gate: `app/actions/ai/discovery.ts` server handshake (OpenAI/Anthropic BYOK → career-grade model list); `stores/ignitionStore.ts` for Primary Fuel selection; `src/lib/config/career-grade-models.ts` filters GPT-4o / Claude 3.5 Sonnet tier |
| 2026-06-19 | `src/lib/config/`: central `ai-config.ts` (OpenAI, Anthropic, Gemini base URLs + default models), `model-discovery.ts` (provider API fetch), `model-cache.ts` (in-memory + localStorage catalog) |
| 2026-06-19 | Studio `LanguagesField` aligned with Projects/Certifications list styling (section title, `INPUT_CLASS` rows, trash); removed Optional/LANG_SEARCH copy; autosuggest + proficiency picker unchanged |
| 2026-06-19 | Studio languages: single `LanguagesField` at bottom of Refinery panel (removed duplicate optional list); Zustand-backed proficiency picker syncs to left `PrimeResume` canvas |
| 2026-06-19 | Zustand `languages` (`{ name, level }[]`) with `addLanguage`/`removeLanguage`; live Languages section on left `PrimeResume` canvas (Studio phase) |
| 2026-06-19 | Studio Phase 3: skill editing stays in right `StudioSkillsField` only; left `PrimeResume` keeps ATS comma-block skills from parsed import (no live studio sync) |
| 2026-06-19 | Identity Zustand: `setTargetRole`, `isIdentityComplete()`; left canvas `IdentityCanvasGhost` technical grid reacts when `identity.targetRole` is locked |
| 2026-06-19 | Identity phase state: Zustand `identity.targetRole` + `identityPhaseComplete`; `isIdentityPhaseComplete` validation; `TargetRoleField` autocomplete; live target-role headline on hub `PrimeResume` canvas |
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
