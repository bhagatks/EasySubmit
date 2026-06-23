# Project State

## Completed

- **AI Engine — Enhance with AI** — … **`[EnhanceAI]` pipeline `step` + `hint`** logs with traceId correlation; **`api_call_logs`** Postgres telemetry via `src/shared/observability` (`[ApiCall]` prefix, provider/slot/label/billingMode/latency/tokens); **system key pool v1** — per-call acquire/failover (`executeWithPoolRetry`), 3-slot Alpha/Beta/Gamma, 3k daily platform cap, Gamma paid overflow hot-toggle, Pass 2 stickiness + `partialEnhance`
- **Glossy UI system** — Shared primitives in `components/ui/`: `DialogContent appearance="glossy"`, `AppAlertDialog`, `GlossyPromoOverlay`, `GlossyFullscreenShell`, `InlineAlert` (`surface="glass"`); used across login, BYOK nudge, confirm dialogs, enhance AI, IgnitionGate, SynthesisTransition
- **Legal & auth** — `/terms`, `/privacy` (Teal/Rezi-style); reusable `components/legal/` overlay for in-app Terms/Privacy; login consent below OAuth buttons with overlay links; Settings Plan & engine privacy copy + AI source toggle; `termsAcceptedAt` on OAuth sign-in
- **Ignition Gate UI** — `src/components/auth/IgnitionGate.tsx`: `ProviderFuelSelect` dropdown for 6 BYOK providers with Lucide icons; scanning-beam validation; cache skip via `lastDiscovery`; Launch/Resume gated on `isIgnitionComplete()`
- **Dashboard gate** — `components/dashboard/DashboardIgnitionGuard.tsx` syncs client ignition with server `vaultKeyId` (resets stale session after key revoke); no navigation block on missing BYOK; one-time `DashboardByokNudge` toast; `BYOK Inactive` on sidebar AI Keys tab; `KeyProtector` overlay reserved for provider auth failures during active use
- **Ignition store** — `src/stores/use-ignition-store.ts`: `unlock`/`lock`/`setActiveModel`; `provider` + `activeModel` in `localStorage`; BYOK `apiKey` AES-GCM encrypted in `sessionStorage` only; `restoreIgnitionFromSession` repopulates `availableModels` from model cache on reload
- **AppConfig** — `src/lib/config/app.config.ts`: `PROVIDER_REGISTRY` (6 providers with `baseUrl` + `handshakeEndpoint`) + `SYSTEM_DEFAULTS`; `ai-config.ts` re-exports for backward compatibility
- **AI config layer** — `model-discovery.ts`, `model-cache.ts`, `career-grade-models.ts` consume `app.config.ts`; BYOK discovery via `app/actions/ai/discovery-service.ts` + `src/lib/ai/neural-controller.ts`
- **NextAuth** — Google + LinkedIn OAuth at `/login`; middleware + layout protect `/onboarding` and `/dashboard`
- **Typed env** — `lib/env.ts`, `types/env.d.ts` for OAuth credentials
- **Login UI** — Google-only OAuth on deep navy glass card (`LogoIcon` w-12, `size="xl"` CTA); `SessionProvider` via `components/providers/auth-provider.tsx`
- **Sign out** — `components/auth/SignOutButton.tsx` + `lib/auth/sign-out-client.ts`; onboarding routes via `OnboardingFlowShell`; dashboard header sign out **Settings only**; other dashboard screens show **BYOK KEY** header CTA when engine is cold
- **Onboarding hub** — `/onboarding`: 3-phase Unified Workbench with unified top chrome (`OnboardingWorkbenchChrome`: EasySubmit brand + phase label/description + phase actions + Sign Out, progress bar, Identity \| Import \| Studio tabs); finalize CTA **Finalize & continue**; ATS sample PDF/DOCX in Import header actions; Studio header: Raw text, Expand all, Import back, Enhance with AI (when flag + system AI on)
- **Resume spec** — `docs/resume/RULES.md`; golden templates in `assets/resume/templates/`; `lib/resume/resumeSpec.ts`; Fuel panel sample download via `/api/resume/ats-template`
- **Open-Resume parser** — PDF via browser Open-Resume engine; **DOCX → PDF** via `docx-to-pdf-wasm` on `/api/resume/convert-docx`, then same PDF parser; heuristic DOCX fallback if conversion parse fails; parsed text normalized via `lib/resume/normalizeResumeText.ts` (junk chars, list markers, smart quotes)
- **Onboarding workbench** — `/onboarding` is the default post-login entry: 60/40 split (Coordinates → Fuel → Refinery), full-screen shell (no sidebar); `/onboarding/step-1` and `/onboarding/workbench` redirect here
- **Resume Studio workbench** — shared `ResumeStudioWorkbench` (onboarding phase 3 + dashboard profile edit): 50/50 resizable split; left preview with auto fit-to-pane zoom (first visit), transparent ± overlay, thin page separators; **dashboard only** — right pane **Editor \| Layout** tabs (onboarding uses Identity → Import → Studio breadcrumb only); Editor = collapsible ATS sections (+ custom sections), onboarding expands Header + Skills by default, dashboard all collapsed; Layout = stacked font + page size (US Letter or A4); zoom `easysubmit-studio-zoom-v1`, page size `easysubmit-page-size-v1`
- **Onboarding flow shell** — asymmetric layout for legacy route wrappers; full-screen bypass for `/onboarding`
- **Codebase cleanup** — removed legacy 11-step wizard, alternate refinery/workbench UIs, TanStack `start/` app, orphan layout/visual components; minimal `components/ui` set retained
- Supabase Auth signup (`/auth/signup`) — legacy email/OAuth path
- `finalizeProfile` — Zustand payload → Prisma Postgres
- **Job Tracker (web v2)** — … **Review Screen** modal: Resume + Cover tabs share full-bleed preview, overlay toolbar (dark chrome), zoom controls; **ATS Analysis** tab (readiness score, keyword gap, bullet quality, robot parse view); resume PDF/Word export via `resume-content-model` + `resume-style`; Cover inline edit + Save, **Enhance with AI** (cover brain + quota), pipeline seeds **deterministic** 4-part cover (~300 words, no AI credits) on tailor; LaTeX editor; `reviewDocuments` on `job_resume_tailors`; …
- **Chrome extension v0.1** — MV3 job card, save API, `/extension/bridge`, `npm run build:extension`; card header **resume profile picker** (icon dropdown, default badge); Settings **Default profile** vs **Last selected**; `sourceProfileId` on save/pipeline metadata; **Open dashboard** reuses existing EasySubmit tab; **Apply with EasySubmit** runs capture → tailor pipeline on Workday (`pipelineBusyLabel` progress); ATS API intercept injected as extension-hosted script (CSP-safe on Workday)
- **Dashboard shell** — `/dashboard`: Lovable-derived sidebar layout (`DashboardShell`), overview with stats/recent Job Tracker entries/ATS Guarantee (`DashboardOverview`); **Resume profiles** at `/dashboard/resume-profiles` — multi-profile list (target role primary label, person name subtitle), Edit / Set default / Delete (when >1), `+` → copy default or blank → Studio editor at `/dashboard/resume-profiles/[id]/edit`; onboarding default profile marked `isDefault`; **Settings** at `/dashboard/settings` — two-column account + AI/extension cards (segmented controls, toggle rows), OAuth connect badges, sign out in header; header `BYOKStatusBadge` when vaulted or **BYOK KEY** CTA when cold (except Settings/AI Keys where BYOK UI is on-page); sidebar **AI Keys** shows `BYOK Inactive` when cold; one-time BYOK nudge on first dashboard load; compact engine-cold callout on overview when BYOK missing; `KeyProtector` for auth-failure re-lock only
- **Multi resume profiles** — many `profiles` per login with `isDefault`; structured resume in `profiles.content` JSONB; engine/stats read default profile; `app/actions/resume-profiles.ts`; cap **`app_config.resumeProfiles.maxProfilesPerCustomer`** (default 20) with dashboard count + disabled add at limit
- **Login identity** — `users.firstName` / `users.lastName` extracted at OAuth; session + onboarding Identity prefill; resume edits no longer write `users`
- **Profile model** — `Profile` (many per `User`, one `isDefault`) with `content` JSONB for all resume sections + `calibrationScore`; multi-provider email linking via NextAuth
- Marketing landing (`/`) + extension page (`/extension`)

## Active work

- **Workday one-click apply E2E** — Phase B tailor stores **per-job overrides** in `job_resume_tailors` (no profile clone); Phase C autofill **stub done**; real Workday field fill **pending** — see [`docs/WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md)
- Extension v2 — Tier 1 ATS adapters (Lever, Ashby, iCIMS, SmartRecruiters, Taleo, Jobvite); detection architecture in [`docs/EXTENSION_DETECTION.md`](./EXTENSION_DETECTION.md)
- **Production deploy (Vercel)** — **deferred** (OAuth prod callbacks done; Vercel/env/migrate when ready)
- **Application Field Memory** — spec in [`docs/APPLICATION_FIELD_MEMORY.md`](./APPLICATION_FIELD_MEMORY.md); agent lanes in [`docs/ACTIVE_WORK.md`](./ACTIVE_WORK.md)

Full tracker: [`docs/JOB_TRACKER.md`](./JOB_TRACKER.md)

## Setup (local)

Focus for now: **`run easy`** + extension on localhost — see [`docs/ENV.md`](./ENV.md).

```bash
run easy    # local dev — see docs/ENV.md
```

Deploy production: `run easy prod` — **deferred**; use when ready (checklist in `docs/ACTION_ITEMS.md`).

## Deploy (Vercel) — deferred

OAuth prod callbacks are registered. Remaining when you ship: Vercel connect, env vars, `NEXTAUTH_URL`, prod migrate (see `MIGRATION_RECOVERY.md`), smoke test.

See `docs/ACTION_ITEMS.md` for the full checklist.

## Dev

```bash
run easy            # local dev (.env.local)
run easy prod       # deploy to Vercel (prod env on Vercel only)
npm run db:check    # test local DB connection
npm run build       # prisma generate + next build
```
