# Onboarding Flow

## Route

`/onboarding` → `OnboardingWizard` (client component)

## Steps

| Step | Component | Data captured | Next gate |
|------|-----------|---------------|-----------|
| 1 | `Step1Timeline` | `jobTimeline` | Option required |
| 2 | `Step3Locations` | `targetLocations[]` | ≥1 location required |
| 3 | `Step4ResumeUpload` | `resumeFile` | Auto on file select |
| 4 | `Step5Parsing` | — | Auto at 100% + 1s delay |
| 5 | `Step6AnalysisComplete` | — | Next enabled |
| 6 | `Step7Experience` | `experienceLevels[]` | ≥1 selected (max 2) |
| 7 | `Step8Roles` | `selectedRole` | Role required |
| 8 | `Step9Salary` | `minSalary` | Always enabled |
| 9 | `Step10Matches` | — | Always enabled |
| 10 | `Step11Survey` | `referralSource` | Option required |
| 11 | `Step12SocialProof` | — | Continue → `/auth/signup` |

## Auth gate

`/auth/signup` — Supabase email/password + Google OAuth.

On successful signup:
1. `POST /api/profile/finalize` — `finalizeProfile()` writes Zustand payload to Postgres (Prisma transaction)
2. Optional resume upload to Supabase Storage bucket `resumes`
3. Redirect → `/dashboard`

OAuth flow: `/auth/callback` → returns to signup with `?oauth=1` → finalize + redirect.

## Client state (Zustand)

Store: `stores/onboardingStore.ts` (persisted to `sessionStorage` except `resumeFile`)

| Key | Type | Set by |
|-----|------|--------|
| `jobTimeline` | `JobTimeline \| null` | Step 1 |
| `targetLocations` | `Location[]` (`id`, `name`, `isResidential`) | Step 2 |
| `resumeSkipped` | `boolean` | Skip resume upload path |
| `isMapping` | `boolean` | Unified mapping animation on Step 4 |
| `resumeFile` | `File \| null` | Step 3 (memory only) |
| `resumeFileName` | `string \| null` | Step 3 |
| `experienceLevels` | `ExperienceLevel[]` | Step 6 |
| `selectedRole` | `string \| null` | Step 7 |
| `minSalary` | `number` | Step 8 |
| `referralSource` | `string \| null` | Step 10 |

## Post-onboarding

`/dashboard` — authenticated welcome screen (features TBD).
