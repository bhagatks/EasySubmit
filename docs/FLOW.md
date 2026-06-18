# Onboarding Flow

## Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/login` | Google + LinkedIn OAuth | Public |
| `/onboarding` | Full wizard | NextAuth required |
| `/onboarding/step-1` | Wizard entry (post-login default) | NextAuth required |
| `/onboarding/step-4` | `ResumeMapping` AI scanner | NextAuth required |
| `/dashboard` | Post-onboarding home | NextAuth required |

Middleware (`middleware.ts`) and `app/onboarding/layout.tsx` both redirect unauthenticated users to `/login`.

## Layout

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

On successful OAuth: redirect → `/onboarding/step-1`.

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
