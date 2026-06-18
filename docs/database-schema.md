# Client State & Database Schema

## Auth (NextAuth)

Session via `/api/auth/[...nextauth]` (`lib/auth.ts`). Protected routes: `/onboarding/*`, `/dashboard/*`. Env vars in `lib/env.ts`.

| Field | Location | Description |
|-------|----------|-------------|
| `lastAuthProvider` | `users` | OAuth provider used at last sign-in (`google`, `linkedin`, …) |
| `provider` | NextAuth `Session` | Set to `"linkedin"` when `lastAuthProvider === "linkedin"` (for onboarding prefill) |

## Onboarding (`useOnboardingStore`)

Persisted in `sessionStorage` (except `resumeFile` and `isMapping`). Storage key: `easysubmit-onboarding`, **persist version: 1**. On hydration failure, `resetStore()` restores `INITIAL_ONBOARDING_STATE`. Synced to Postgres on signup via `finalizeProfile`.

| Field | Type | Description |
|-------|------|-------------|
| `jobTimeline` | `JobTimeline \| null` | Step 1 answer |
| `targetLocations` | `Location[]` | `{ id, name, isResidential }` — multi-select cities; exactly one should have `isResidential: true` (home base / resume primary address) |
| `resumeSkipped` | `boolean` | User skipped resume upload |
| `isMapping` | `boolean` | Unified mapping animation (transient, not persisted) |
| `resumeFile` | `File \| null` | In-memory only until signup |
| `resumeFileName` | `string \| null` | Resume filename |
| `experienceLevels` | `ExperienceLevel[]` | Max 2 |
| `selectedRole` | `string \| null` | Role specialization |
| `minSalary` | `number` | Minimum salary in thousands USD |
| `referralSource` | `string \| null` | Survey answer |

## PostgreSQL (`user_profiles` via Prisma)

| Column | Type | Description |
|--------|------|-------------|
| `id` | `cuid` | Primary key |
| `userId` | `string` unique | Supabase Auth user ID |
| `email` | `string` | User email |
| `jobTimeline` | `string?` | |
| `experienceLevels` | `string[]` | |
| `selectedRole` | `string?` | |
| `minSalary` | `int?` | Thousands USD |
| `referralSource` | `string?` | |
| `targetLocations` | `json` | Location array; entry with `isResidential: true` is primary resume address |
| `resumePath` | `string?` | Supabase Storage path |
| `resumeFileName` | `string?` | |
| `createdAt` / `updatedAt` | `datetime` | |

### Setup

```bash
cp .env.example .env.local   # fill Supabase + DATABASE_URL
npx prisma migrate dev --name init
```

Create Supabase Storage bucket: `resumes` (private, authenticated upload).
