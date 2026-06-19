# Onboarding Flow

## Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/login` | Google + LinkedIn OAuth | Public |
| `/onboarding` | **Default entry** — 60/40 Unified Workbench: left ATS-ordered `PrimeResume` preview, right Identity → Import → Studio → Launch; System Status breadcrumb (Phase 1 locked after Import); Studio **Upload** back → Import | NextAuth required |
| `/onboarding/step-1` | Redirect → `/onboarding` | NextAuth required |
| `/onboarding/workbench` | Redirect → `/onboarding` (alias) | NextAuth required |
| `/onboarding/refinery` | Legacy full-screen refinery workbench | NextAuth required |
| `/onboarding/step-4` | `ResumeMapping` AI scanner | NextAuth required |
| `/dashboard` | Post-onboarding home | NextAuth required |

Middleware (`middleware.ts`) and `app/onboarding/layout.tsx` both redirect unauthenticated users to `/login`.

## Unified Workbench (`/onboarding`)

Primary onboarding path — client state in `app/onboarding/page.tsx` (not Zustand). Left canvas: `PrimeResume` live-sync. Right panel: four phases with Framer Motion transitions.

| Phase | Panel | Data captured | Navigation |
|-------|-------|---------------|------------|
| 1 · Identity | `CoordinatesPanel` | `firstName`, `lastName`, `cityState` (Nominatim debounce + locate via `CityStateField`), `phone` with country-code selector (default US +1), `email`, `linkedIn` | Continue → Import; `completeStep(1)` |
| 2 · Import | `FuelPanel` | Resume PDF/DOCX → `parseResumeFile` (browser Open-Resume pipeline) | **No back to Phase 1** (`minNavigablePhase=2` on breadcrumb); auto-advance to Studio after parse |
| 3 · Studio | `RefineryPanel` | ATS section order (Header → Summary → Skills → Experience → Education → optional Certifications/Projects/Languages); `mergeParsedWithCoordinates` prefills contact from Phase 1 | **Upload** back button → Import (re-upload); Continue to Launch → Phase 4 |
| 4 · Launch | `CalibrationPanel` | `completeOnboarding` + 2.5s pulse → `/dashboard` | — |

Resume section order and preview typography follow **`EASYSUBMIT_RESUME_RULES.md`** at the repository root (code constants in `lib/resume/resumeSpec.ts`). Golden fixtures: `ATS_Universal_Resume_Template.pdf` / `.docx` (download via `/api/resume/ats-template`).

Merge logic: `lib/onboarding/hubResume.ts` — parsed resume contact fields win when present; Phase 1 manual entry fills gaps.

## Legacy layout / wizard

`app/onboarding/layout.tsx` → `OnboardingFlowShell`:

- **Background:** deep navy (`oklch(0.16 0.04 268)`)
- **Desktop:** progress panel (left), step content (right)
- **Mobile:** progress on top, content below
- **Macro phases (4):** Profile → Experience → Goals → AI Mapping (`lib/onboarding/phases.ts`)
- **Transitions:** Framer Motion `AnimatePresence` (`OnboardingStepTransition`)

## Wizard steps

| Step | Component | Data captured | Next gate |
|------|-----------|---------------|-----------|
| 1 | `Step1Timeline` | `jobTimeline` | Option required |
| 2 | `Step3Locations` | `targetLocations[]` | ≥1 location required |
| 3 | `Step4ResumeUpload` | `resumeFile` | Redirect → `/onboarding/step-4` on upload |
| — | `ResumeMapping` (step-4 route) | visual only | Success → `/dashboard` |
| 6 | `Step7Experience` | `experienceLevels[]` | ≥1 selected (max 2) |
| 7 | `Step8Roles` | `selectedRole` | Role required |
| 8 | `Step9Salary` | `minSalary` | Always enabled |
| 9 | `Step10Matches` | — | Always enabled |
| 10 | `Step11Survey` | `referralSource` | Option required |
| 11 | `Step12SocialProof` | — | Finalize Profile → `/dashboard` |

Skip resume on step 3 → `completeResumeMapping()` → step 6 (experience).

## Auth

### Login (NextAuth)

`/login` — Google + LinkedIn via `/api/auth/[...nextauth]`.

On successful OAuth: redirect → `/onboarding`.

**Env:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

### Signup (Supabase — legacy)

`/auth/signup` — email/password + Google OAuth.

On success: `POST /api/profile/finalize` → optional resume upload → `/dashboard`.

## Client state (Zustand)

Store: `stores/onboardingStore.ts` — persisted to `sessionStorage` (key: `easysubmit-onboarding`, version 1). `resumeFile` and `isMapping` are not persisted.

| Key | Type | Set by |
|-----|------|--------|
| `jobTimeline` | `JobTimeline \| null` | Step 1 |
| `targetLocations` | `Location[]` | Step 2 |
| `resumeSkipped` | `boolean` | Skip resume |
| `isMapping` | `boolean` | Step-4 route / mapping UI |
| `resumeFile` | `File \| null` | Step 3 (memory only) |
| `resumeFileName` | `string \| null` | Step 3 |
| `experienceLevels` | `ExperienceLevel[]` | Step 6 |
| `selectedRole` | `string \| null` | Step 7 |
| `minSalary` | `number` | Step 8 |
| `referralSource` | `string \| null` | Step 10 |

## Post-onboarding

`/dashboard` — authenticated welcome screen (features TBD).
