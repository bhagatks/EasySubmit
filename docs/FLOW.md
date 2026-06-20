# Onboarding Flow

## Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/login` | Google + LinkedIn OAuth | Public |
| `/onboarding` | **Default entry** — 60/40 Unified Workbench: left ATS-ordered `PrimeResume` preview, right Identity → Import → Studio; System Status breadcrumb (Phase 1 locked after Import); Studio **Upload** back → Import | NextAuth required |
| `/onboarding/step-1` | Redirect → `/onboarding` | NextAuth required |
| `/onboarding/workbench` | Redirect → `/onboarding` (alias) | NextAuth required |
| `/onboarding/refinery` | Legacy full-screen refinery workbench | NextAuth required |
| `/onboarding/step-4` | `ResumeMapping` AI scanner | NextAuth required |
| `/dashboard` | Post-onboarding overview — **Cold Engine** when `vaultKeyId` is null (blurred resume canvas, BYOK inactive badge, Ignition Chamber CTA); hot engine when vaulted | NextAuth required |
| `/dashboard/resume-profiles` | Resume profile list (role label + person subtitle); Edit, Set default, Delete when >1; `+` → new (copy default or blank) → Studio editor | NextAuth required |
| `/dashboard/resume-profiles/new` | Choose copy-from-default or blank starter | NextAuth required |
| `/dashboard/resume-profiles/[id]/edit` | Resume Studio — same Refinery controls as onboarding Phase 3 + profile role field | NextAuth required |
| `/dashboard/applications` | Application tracker (stub) | NextAuth required |
| `/dashboard/keys` | **Ignition Chamber** — post-onboarding BYOK vault (Power Cells, IGNITE handshake) | NextAuth required |
| `/dashboard/settings` | Account settings — login identity (`users`), connected OAuth providers, engine status stub, sign out | NextAuth required |

Middleware (`middleware.ts`) and `app/onboarding/layout.tsx` both redirect unauthenticated users to `/login`. **Sign out** — `SignOutButton` clears client state, ends the NextAuth session, and returns everyone to `/login?signedOut=1` (same flow for Google and LinkedIn).

## Unified Workbench (`/onboarding`)

Primary onboarding path — client state in `app/onboarding/page.tsx` (not Zustand). Left canvas: `PrimeResume` live-sync. Right panel: three phases with Framer Motion transitions.

| Phase | Panel | Data captured | Navigation |
|-------|-------|---------------|------------|
| 1 · Identity | `CoordinatesPanel` | `firstName`, `lastName`, `cityState` (Nominatim debounce + locate via `CityStateField`), `phone` with country-code selector (default US +1), `email` | Continue → Import; `completeStep(1)` |
| 2 · Import | `FuelPanel` | Resume PDF/DOCX → `parseResumeFile` (browser Open-Resume pipeline) | **No back to Phase 1** (`minNavigablePhase=2` on breadcrumb); auto-advance to Studio after parse |
| 3 · Studio | `RefineryPanel` | ATS section order (Header → Summary → Skills → Experience → Education → optional Certifications/Projects/Languages); `mergeParsedWithCoordinates` prefills contact from Phase 1 | **Import** back → re-upload; **Finalize & continue** → see bridge below |

### Synthesis Transition (Phase 3 → Dashboard)

After Studio, **Finalize & continue** does **not** advance to a fourth onboarding phase. Instead:

1. **`SynthesisTransition`** (`components/onboarding/SynthesisTransition.tsx`) — full-screen mint scanning beam, JSON particle flow, JetBrains Mono status copy (~3s).
2. **`completeOnboarding`** — persists profile + Career Architecture JSONB (no BYOK / AI provider required).
3. **Redirect → `/dashboard`** — user lands on the dashboard with architecture drafted.

If **`users.vaultKeyId`** is null, the dashboard renders in **Cold Engine** state (overview blurred resume canvas, `BYOK Inactive • Engine Cold`, Ignition Chamber hint). BYOK is optional at onboarding exit.

```text
Phase 3 Studio  →  SynthesisTransition  →  /dashboard  →  (optional) Phase 4 Ignition Chamber
```

| Phase | Where | Purpose | BYOK required? |
|-------|--------|---------|----------------|
| 4 · Ignition Chamber (post-onboarding) | `/dashboard/keys` | Vault provider keys into Power Cells; `igniteEngineVault` + Ignition Blast; Prime Paper unlock | Yes, to run headless engine |

Resume section order and preview typography follow **`docs/resume/RULES.md`** (code constants in `lib/resume/resumeSpec.ts`). Golden fixtures: `assets/resume/templates/` (download via `/api/resume/ats-template`).

Merge logic: `lib/onboarding/hubResume.ts` — parsed resume contact fields win when present; Phase 1 manual entry fills gaps.

## Legacy layout / wizard

`app/onboarding/layout.tsx` → `OnboardingFlowShell`:

- **Background:** deep navy (`oklch(0.16 0.04 268)`)
- **Desktop:** progress panel (left), step content (right)
- **Mobile:** progress on top, content below
- **Macro phases (4):** Profile → Experience → Goals → AI Mapping (`lib/onboarding/phases.ts`) — legacy wizard only; hub workbench uses 3 phases + Synthesis Transition
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

Canonical identity separation and app-load routing: **`docs/IDENTITY_AND_BOOT_RULES.md`**.

### Login (NextAuth)

`/login` — Google + LinkedIn via `/api/auth/[...nextauth]`.

On successful OAuth: redirect → `/onboarding` until `onboardingStep >= 4`, then **`/dashboard`**.

**Cold Engine on first dashboard visit:** Users who complete onboarding without a vaulted key (`vaultKeyId` null) land on **`/dashboard`** with Engine Cold UI — navigation is not blocked. A one-time centered nudge (`DashboardByokNudge`, `easysubmit-byok-nudge-v1`) prompts them to connect AI Keys; `BYOK Inactive` appears on the sidebar **AI Keys** nav item. `DashboardIgnitionGuard` only syncs stale client ignition state when the server vault is empty.

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

### Dashboard (`/dashboard`)

Authenticated home after `onboardingStep >= 4`. Overview (`DashboardOverview`) shows stats, recent applications (when engine hot), and verification metrics when BYOK is active.

| Engine state | Condition | UI |
|--------------|-----------|-----|
| **Cold Engine** | `vaultKeyId` null | Blurred resume preview, **Neural Calibration Pending** watermark, `BYOK Inactive • Engine Cold` badge, glass hint → Ignition Chamber |
| **Hot Engine** | `vaultKeyId` set | High-contrast canvas, recent applications, ATS Guarantee verification panel |

### Phase 4 · Ignition Chamber (`/dashboard/keys`)

Post-onboarding BYOK — **not** part of the `/onboarding` workbench. Users vault OpenAI, Anthropic, Gemini, Groq, or DeepSeek keys into Power Cells. Successful **`igniteEngineVault`** triggers **Ignition Blast** (mint bloom, screen shake, `POWER STABILIZED` overlay) and unlocks Prime Paper on the chamber canvas.

See **`docs/ARCHITECTURE.md`** for vault schema and headless engine contracts.
