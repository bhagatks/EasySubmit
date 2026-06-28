# Identity, Resume Profiles & App Boot Rules

Canonical rules for separating **login identity** from **resume profile data**, and for routing users on every app load.

**Screen inventory:** [`SCREENS.md`](./SCREENS.md) — marketing landing (`/`), dashboard routes, and extension surfaces.

## Two data domains (never merge)

| Domain | Table | Purpose | Lifetime |
|--------|-------|---------|----------|
| **Login profile** | `users` (+ `accounts`, `sessions`) | Who signed in; OAuth linkage; onboarding gate | One row per human, forever |
| **Resume profile** | `profiles` (+ `experiences`, `projects`, …) | Career data used for ATS resume + autofill | One **default** row today; multiple rows later |

**Rule:** Login data and resume data are stored separately. Resume contact fields may be *seeded* from login at profile creation, but edits to resume data must **never** write back to `users`.

---

## Primary keys

### Login profile (`User`)

| Key | Column | Role |
|-----|--------|------|
| **Primary key** | `users.id` (`cuid`) | Stable anchor for the lifetime of the account |
| **Natural lookup** | `users.email` (`unique`) | Match Google / LinkedIn to the same account |
| **Provider link** | `accounts.(provider, providerAccountId)` (`unique`) | OAuth tokens per provider |

Writable on login (login profile only):

- `firstName`, `lastName`, `name` (display), `email`, `image`, `emailVerified`, `lastAuthProvider`, `onboardingStep`

`firstName` / `lastName` are normalized once at OAuth via `extractLoginIdentity()` in `lib/auth/extract-login-identity.ts`.

### Resume profile (`Profile`)

| Key | Column | Role |
|-----|--------|------|
| **Primary key** | `profiles.id` (`cuid`) | Stable anchor for one resume variant |
| **Owner** | `profiles.userId` → `users.id` | FK; **unique today** (= one default profile per user) |
| **Future** | `profiles.isDefault` (planned) | Marks the base profile; remove `userId` unique when multi-profile ships |

Writable during onboarding / resume editor only:

- `firstName`, `lastName`, `email`, `phone`, `city`, `country`, `targetTitle`, `summary`, `skills`, `resumeRawText`, nested `experiences` / `projects` / `educations` / `certifications`

---

## Seed rule (onboarding Phase 1 · Identity)

When the **first** resume profile row is created for a user:

1. Copy from login session: `firstName`, `lastName`, `email` (and `phone` when OAuth provides it).
2. User may change any seeded field before saving; saved values live on `profiles` only.
3. Do **not** update `users.name` / `users.email` when the user edits resume contact fields.

---

## OAuth sign-in (Google or LinkedIn)

```
email from provider
        │
        ▼
┌───────────────────┐     no      ┌─────────────────────────────┐
│ users.email       │────────────►│ Create User + Account         │
│ already exists?   │             │ onboardingStep = 0            │
└─────────┬─────────┘             │ Create empty default Profile  │
          │ yes                   │ (seed contact from OAuth)     │
          ▼                       └──────────────┬────────────────┘
┌───────────────────┐                            │
│ Update User only: │                            ▼
│ lastAuthProvider  │                   → /onboarding (new user)
│ name, image       │
│ (if provider      │
│  supplies them)   │
│                   │
│ DO NOT overwrite  │
│ profiles contact  │
│ fields            │
└─────────┬─────────┘
          ▼
   resolvePostAuthDestination()
          │
          ├─ default Profile missing mandatory fields → /onboarding (resume phase)
          ├─ AI key not verified (BYOK / credits)     → /onboarding?ignition=1
          └─ all gates pass                           → /dashboard
```

**Mandatory fields** on the default resume profile (server-validated before dashboard):

| Field | Required |
|-------|----------|
| `firstName` | yes |
| `lastName` | yes |
| `email` | yes (valid format) |
| `phone` | yes (valid E.164 / country rules) |
| `targetTitle` | yes |
| `summary` | yes |
| `skills` | ≥ 1 |
| `experiences` | ≥ 1 row |

Optional at gate: `city`, `country`, `projects`, `educations`, `certifications`.

**AI key gate:** Primary Fuel handshake must succeed (local BYOK cipher or server credits / PRO tier). Failure → `/onboarding?ignition=1`, not dashboard.

---

## App boot resolver (every navigation)

Run on **every** authenticated request (middleware or shared `resolveAppDestination`):

```
Request pathname
        │
        ▼
┌─────────────────┐     no      ┌──────────┐
│ Valid session?  │────────────►│ /login   │  (save callbackUrl)
└────────┬────────┘             └──────────┘
         │ yes
         ▼
┌─────────────────┐
│ Load User by    │
│ session.user.id │
└────────┬────────┘
         ▼
┌─────────────────────────────┐     no     ┌──────────────┐
│ Default Profile exists?     │───────────►│ /onboarding  │
└────────┬────────────────────┘            └──────────────┘
         │ yes
         ▼
┌─────────────────────────────┐     no     ┌──────────────┐
│ Profile mandatory complete? │───────────►│ /onboarding  │
└────────┬────────────────────┘            └──────────────┘
         │ yes
         ▼
┌─────────────────────────────┐     no     ┌─────────────────────────┐
│ onboardingStep >= 4 AND     │───────────►│ /onboarding             │
│ AI key verified?            │            │ (resume or ?ignition=1) │
└────────┬────────────────────┘            └─────────────────────────┘
         │ yes — “ready”
         ▼
   Route-specific rules (below)
```

### Route-specific rules (ready user)

| Path | Action |
|------|--------|
| `/` (base URL) | Authenticated → `/dashboard`. Anonymous → marketing landing (no redirect). |
| `/login` | Redirect → `/dashboard` |
| `/onboarding` | Redirect → `/dashboard` (unless `?ignition=1` for key re-verify) |
| `/dashboard/*` | Allow; **display login profile data only** in chrome (name, email, avatar from `session.user`) |
| `/dashboard/resume-profiles` | List default profile; `+` control reserved for future multi-profile |
| Other protected paths | Allow |

### Anonymous visitor

| Path | Action |
|------|--------|
| `/`, `/login` | Allow |
| Everything else | Redirect → `/login?callbackUrl=…` |

---

## Dashboard display rules

| Surface | Data source | Fields |
|---------|-------------|--------|
| Header welcome, Settings (account) | `session.user` / `users` | `name`, `email`, `image` |
| Resume profiles page | `profiles` where `userId = session.user.id` | All career / resume fields |
| Overview stats, applications | Product data (not login profile) | TBD |

**Never** show `profiles.firstName` in the dashboard welcome line — use login `users.name` (fallback: email local-part).

---

## Multi-profile (future)

When `+` ships on Resume profiles:

- Drop `profiles.userId` unique constraint.
- Add `label`, `isDefault`, `sortOrder`.
- Onboarding still creates exactly one row with `isDefault = true`.
- Extension / apply engine uses **active** profile id (stored in client + server preference).

---

## Implementation status (2026-06-19)

| Rule | Status |
|------|--------|
| `users.id` / `profiles.id` as PKs | ✅ In schema |
| `users.firstName` / `users.lastName` at OAuth extract | ✅ `lib/auth/extract-login-identity.ts` |
| Login vs resume separation in docs | ✅ This file |
| OAuth updates User only (no Profile overwrite) | ✅ `seedDefaultResumeProfile` create-only |
| Resume edits do not write `users` | ✅ `syncUserDisplayName` removed |
| Server mandatory-field gate before dashboard | ⚠️ Client-only today |
| AI key gate on returning login | ⚠️ `DashboardIgnitionGuard` client-only |
| Sidebar “Resume profiles” | ✅ `/dashboard/resume-profiles` |
| Multi-profile schema | 🔜 Planned |
