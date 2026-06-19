# Client State & Database Schema

## Auth (NextAuth)

Session via `/api/auth/[...nextauth]` (`lib/auth.ts`). Protected routes: `/onboarding/*`, `/dashboard/*`. Env vars in `lib/env.ts`.

| Field | Location | Description |
|-------|----------|-------------|
| `lastAuthProvider` | `users` | OAuth provider used at last sign-in (`google`, `linkedin`, …) |
| `onboardingStep` | `users` | Wizard progress (0–4); `0` = not started; synced to JWT |
| `userId` | NextAuth `Session` | Same as `session.user.id`; explicit for multi-platform sync |
| `provider` | NextAuth `Session` | Set to `"linkedin"` when `lastAuthProvider === "linkedin"` (for onboarding prefill) |

Multi-platform account linking: `allowDangerousEmailAccountLinking: true` merges Google/LinkedIn accounts that share an email. `signIn` callback updates `lastAuthProvider` and upserts `Profile`.

## Onboarding (`useOnboardingStore`)

Persisted in `sessionStorage` (except `resumeFile` and `isMapping`). Storage key: `easysubmit-onboarding`, **persist version: 1**. On hydration failure, `resetStore()` restores `INITIAL_ONBOARDING_STATE`. Synced to Postgres via `completeStep` / `updateUserOnboarding` and legacy signup via `finalizeProfile`.

| Field | Type | Description |
|-------|------|-------------|
| `targetLocations` | `Location[]` | Client-only during wizard; `{ id, name, isResidential }` |
| `resumeSkipped` | `boolean` | User skipped resume upload |
| `isMapping` | `boolean` | Unified mapping animation (transient, not persisted) |
| `resumeFile` | `File \| null` | In-memory until upload |
| `resumeFileName` | `string \| null` | Resume filename |
| `selectedRole` | `string \| null` | Maps to `profiles.targetTitle` |
| `minSalary` | `number` | Minimum salary in thousands USD → `profiles.minSalary` |

## PostgreSQL — `users` (Prisma `User`)

Auth identity and onboarding gate only. Career data lives on `Profile`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `cuid` | Primary key |
| `email` | `string?` unique | User email |
| `onboardingStep` | `int` default `0` | Wizard step (0 = not started, 1–4 in progress) |
| `lastAuthProvider` | `string?` | Last OAuth provider |
| `createdAt` / `updatedAt` | `datetime` | |

## PostgreSQL — `profiles` (Prisma `Profile`)

1:1 with `User`. Source of truth for career profile synced to the extension engine.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `cuid` | Primary key |
| `userId` | `string` unique | FK → `users.id` |
| `fullName` | `string?` | Display name |
| `email` | `string` | Required contact email |
| `phone` | `string?` | |
| `city` / `country` | `string?` | Location |
| `targetTitle` | `string?` | Target job title |
| `minSalary` | `int?` | Minimum salary (thousands USD) |
| `workMode` | `string?` | e.g. `Remote`, `Hybrid`, `On-site` |
| `summary` | `text?` | Professional summary |
| `coreCompetencies` | `string[]` | Core competency tags |
| `skills` | `string[]` | Skill tags |
| `resumeRawText` | `text?` | Plain-text resume for parsing / refinery |
| `createdAt` / `updatedAt` | `datetime` | |

### Related profile models

| Model | Key fields | Relation |
|-------|------------|----------|
| `Experience` | `company`, `title`, `location`, `startDate`, `endDate`, `description`, `isCurrent` | `profileId` → `profiles.id` |
| `Project` | `name`, `description`, `url`, `startDate`, `endDate` | `profileId` → `profiles.id` |
| `Education` | `institution`, `degree`, `field`, `startDate`, `endDate` | `profileId` → `profiles.id` |
| `Certification` | `name`, `issuer`, `issueDate`, `url` | `profileId` → `profiles.id` |

## PostgreSQL — `engines` (Prisma `Engine`)

AI engine output (parsed resume / mapping JSON). One row per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `cuid` | Primary key |
| `userId` | `string` unique | FK → `users.id` |
| `parsedData` | `json?` | Structured resume from AI mapping |
| `createdAt` / `updatedAt` | `datetime` | |

### Setup

```bash
cp .env.example .env.local   # fill DATABASE_URL
npx prisma migrate dev
npx prisma generate
```
