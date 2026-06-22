# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Primary entry after login: `/onboarding`. Marketing site at `/`.

## Data model

Postgres (Prisma) + Supabase Vault BYOK + client Zustand stores. Login identity (`users`) is separate from career data (`profiles` + `content` JSONB). Job search tracking: `job_tracker_entries` (`JobTrackerEntry`) — see [`docs/JOB_TRACKER.md`](./JOB_TRACKER.md). Per-table audit: [`docs/TABLE_INVENTORY.md`](./TABLE_INVENTORY.md).

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Marketing | Next.js 14, Tailwind, dark-first tokens | `/` |
| Web onboarding | Next.js, Framer Motion, Zustand | `/onboarding` (3-phase workbench); legacy aliases redirect here |
| Auth login | NextAuth (Google + LinkedIn OAuth) | `/login` → `/api/auth/[...nextauth]` |
| Auth signup | Supabase Auth (legacy path) | `/auth/signup` |
| Dashboard | NextAuth-protected shell + sidebar nav | `/dashboard` (+ `/dashboard/resume-profiles`, `/dashboard/job-tracker`, `/keys`, `/settings`) |
| Extension landing | Static marketing | `/extension` |
| Chrome extension | MV3 in-page job card v0.1 | `dist/extension/` (load unpacked) |

## Auth & route protection

- **`middleware.ts`** — Auth gate: anonymous → `/` + `/login` only; logged-in `onboardingStep < 4` → `/onboarding`; `onboardingStep >= 4` → `/dashboard` allowed (JWT via NextAuth)
- **`lib/supabase/`** — `client.ts`, `server.ts`; keys via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`app/onboarding/layout.tsx`** — server session check + `OnboardingFlowShell`
- **`lib/auth.ts`** — NextAuth options; post-login redirect → `/onboarding`
- **`lib/env.ts`** + **`types/env.d.ts`** — typed OAuth / NextAuth env vars

## Directory map

```
app/
  api/auth/[...nextauth]/   NextAuth handler
  login/                    OAuth sign-in UI
  onboarding/
    layout.tsx              Auth gate + flow shell
    page.tsx                3-phase Unified Workbench (Identity → Import → Studio)
    step-1/page.tsx         Redirect → `/onboarding`
    step-4/page.tsx         Redirect → `/onboarding`
    refinery/page.tsx       Redirect → `/onboarding`
  dashboard/
    layout.tsx              KeyProtector + sidebar shell
    page.tsx                Overview (stats, recent apps, ATS guarantee)
    resumes/                Placeholder
    job-tracker/            Job Tracker list (v1 chronological)
    applications/           Redirect → `/dashboard/job-tracker`
    keys/                   Placeholder
    settings/               Account settings (`AccountSettings`)
components/
  onboarding/
    OnboardingFlowShell.tsx Asymmetric layout + phase progress (legacy routes)
    hub/                    CoordinatesPanel, FuelPanel, RefineryPanel, IgnitionGate re-export
    PrimeResume.tsx         ATS-ordered live canvas (onboarding + dashboard studio)
  ui/                       Minimal shadcn set (button, sidebar, dialog, resizable, …)
lib/
  auth.ts                   NextAuth config
  env.ts                    Server env validation
  supabase/                 SSR clients
  onboarding/phases.ts      Macro phase mapping (Profile → AI Mapping)
src/lib/config/
  app.config.ts             SERVICE_REGISTRY + SYSTEM_DEFAULTS — AI single source of truth
  ai-config.ts              Legacy re-exports from app.config
  career-grade-models.ts    Career-grade filter for Ignition Gate model picker
  model-discovery.ts        Live model list fetch per provider API
  model-cache.ts            In-memory + localStorage model catalog cache
app/actions/ai/
  discovery-service.ts      Server action — BYOK handshake + ENGINE_ERRORS
  engine.ts                 Career Architecture refinement (Vercel AI SDK)
src/lib/ai/
  neural-controller.ts      Single export surface for discovery + refinement
  discovery-service.ts      Handshake orchestration + career-grade gate
  engine-errors.ts          ENGINE_ERRORS + JetBrains Mono terminalLine formatter
src/
  stores/                   onboarding-store.ts, use-ignition-store.ts
  hooks/                    use-mobile.tsx
  types/                    env.d.ts, next-auth.d.ts
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
middleware.ts               NextAuth route protection (onboardingStep gate)
docs/                       System of record (+ docs/resume/RULES.md)
assets/resume/              ATS golden templates + sample PDFs (not web-served)
config/                     vitest.config.ts, tailwind.config.ts
public/                     Web-static assets only
extension/                  MV3 source (content script, popup, background)
lib/extension/              Pipeline orchestrator, job service, auth token, scraper tests
lib/profile/                Profile copy + persist helpers for pipeline tailor
```

## Extension one-click pipeline (Workday)

Gated by `feature_flags.extension_auto_apply` + `users.oneClickApply`. Entry: extension card **Apply with EasySubmit** → `POST /api/extension/jobs/pipeline`.

```
Extension RUN_PIPELINE
  → runApplyPipeline (lib/extension/apply-pipeline.ts)
      → saveJobTrackerEntry → CAPTURED
      → runPipelineTailor (lib/extension/pipeline-tailor.ts)
          → copySourceProfileForJob
          → enhanceResumeForUserId (variant: pipeline)
          → persistProfileFromForm
      → RESUME_READY + tailoredProfileId
      → pendingPhase: "autofill" (Phase C not implemented)
```

Status flow: `CAPTURED` → `RESUME_READY` → `READY_TO_APPLY` → `APPLIED`. Tailor failure: job stays `CAPTURED`, cloned profile deleted, error in `metadata.pipelineError`; API returns HTTP 200 with `saved: true`. Autofill stub: extension `runAutofillPhase` → `POST /api/extension/jobs/:id/autofill-complete` → `READY_TO_APPLY` (real Workday field fill pending Phase C1–C5).

Spec: [`docs/WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md).

## Onboarding flow

### Unified Workbench (`app/onboarding/page.tsx`)

- **3 phases:** Identity (Coordinates) → Import (Fuel) → Studio (Refinery)
- Left canvas: `PrimeResume` + `ScanningBeam` during parse
- Right panel: hub panels with `SystemStatusBreadcrumb`
- Finalize → `SynthesisTransition` → `completeOnboarding` → `/dashboard/keys`
- Full-screen shell bypasses `OnboardingFlowShell` sidebar chrome

### Layout (`OnboardingFlowShell`)

- Deep navy background (`oklch(0.16 0.04 268)`)
- Used for legacy route wrappers; canonical workbench is full-screen at `/onboarding`

## Design system

Dark-first Trust Tech palette in `app/globals.css`: surface `oklch(0.16 0.04 268)`, engine glow `oklch(0.62 0.21 265)`, system mint `oklch(0.82 0.16 165)`, warning red `oklch(0.55 0.22 25)`. Typography: Space Grotesk (`font-display`), DM Sans (`font-sans`). Global radius 12px (`rounded-xl`). App icon: `app/icon.svg` (navy monogram).

## Changelog

| Date | Summary |
|------|---------|
| 2026-06-22 | Review Screen ATS Analysis tab: readiness score (4 pillars), keyword gap, bullet quality, robot parse view; shared `resume-content-model` for HTML/PDF/Word/ATS exports |
| 2026-06-22 | ATS-quality resume exports: `resume-docx` + `resume-pdf` via `resume-content-model` + `resume-style`; Review export async wiring |
| 2026-06-22 | Review Screen Studio Edit (`?from=review`): hides dashboard sidebar, Review Screen header/tabs chrome, no tailor banner; save returns to Review Resume tab; pipeline Studio link unchanged |
| 2026-06-22 | Review Screen Resume + Cover document tabs: shared toolbar (Studio Edit / Enhance / PDF / Word / LaTeX), cover inline edit + `job_resume_tailors` document fields, LaTeX fullscreen editor (validate + HTML preview), server actions in `app/actions/review-documents.ts` |
| 2026-06-22 | Review Screen Resume tab: inline merged `PrimeResume` preview, tailored-section pills, Edit in Studio; `getJobTrackerEntryById` loads `tailoredResumePreview` |
| 2026-06-22 | Job tailor storage Option B: `job_resume_tailors` overrides + merge at read; Job Tracker Studio `/dashboard/job-tracker/[id]/resume`; base profile dependency warning |
| 2026-06-22 | Workday pipeline Phase C stub + Phase D polish: autofill-complete API, content `runAutofillPhase`, card status polling, kanban Studio link, popup one-click toggle |
| 2026-06-22 | Workday pipeline Phase B3–B7: `runApplyPipeline` → `runPipelineTailor` (copy + `enhanceResumeForUserId` + persist) → `RESUME_READY` + `pendingPhase: autofill`; partial failure keeps `CAPTURED` with `metadata.pipelineError`; pipeline variant gates on `extension_auto_apply` |
| 2026-06-22 | Workday pipeline Phase B1–B2: `enhanceResumeForUserId` (bearer-safe Enhance) + `copySourceProfileForJob` (job profile clone with `targetTitle`) |
| 2026-06-21 | Extension dashboard navigation: `OPEN_DASHBOARD` reuses/focuses existing EasySubmit tab (`pickAppTabToReuse`); Job Tracker Review opens in-modal via client state (URL only when extension deep-links `?job=`) |
| 2026-06-21 | Extension save sync: API base URL pinned to request origin + bridge host; job tracker page force-dynamic; save errors surfaced on card |
| 2026-06-21 | Extension scraper: Workday `/details/` URLs, Phenom/iCIMS/Slalom careers URL+DOM selectors, pre-hydration title parsing; fixture tests in `lib/extension/` |
| 2026-06-21 | Dashboard layout: unified `max-w-3xl` (768px) via `lib/dashboard/dashboard-layout.ts` + `DashboardWorkspacePage` for all sidebar tabs |
| 2026-06-21 | Dashboard workspace toolbar: header action icons (save/add) + expand/collapse-all on Settings, Resume profiles, Resume Studio, AI Keys; collapsible section stacks |
| 2026-06-21 | Dashboard Settings: two-column layout, horizontal segmented controls (AI source, extension resume), toggle rows — fits viewport without scroll on desktop |
| 2026-06-21 | Job Tracker UI polish: left-aligned compact rows (role · company single line + truncate), animated pipeline/Apply CTA, Review Screen header (close + status row), tracker-only refresh on tab focus |
| 2026-06-21 | Job Tracker review overlay: universal modal on `/dashboard/job-tracker` with Job/Resume/Cover/Apply tabs, capture completeness, Review CTAs, extension deep-link `?job=` |
| 2026-06-21 | Extension resume profile picker: card header icon dropdown, `GET /api/extension/resume-profiles`, Settings default vs last-selected mode, `sourceProfileId` on save/pipeline |
| 2026-06-21 | Feature flag `extension_auto_apply`: when off, extension uses manual 3-step flow (Save to Tracker → Update resume → Apply); gates one-click pipeline + Settings toggle |
| 2026-06-21 | Workday one-click apply: `users.oneClickApply` (default on), Settings toggle, `POST /api/extension/jobs/pipeline`, extension **Apply with EasySubmit** CTA on Workday; spec in `docs/WORKDAY_ONE_CLICK_APPLY.md` |
| 2026-06-21 | Job Tracker v2: pipeline row UI (pizza bar), Review Screen rename, Archive header + auto-archive setting, delete with confirm, Apply → extension `START_APPLY` |
| 2026-06-21 | Job Tracker v1.1: Kanban board at `/dashboard/job-tracker` — superseded by v2 pipeline rows |
| 2026-06-21 | Chrome extension v0.2.0: Stage 1 animated capture nudge below job card (tailor-resume pipeline teaser); default card anchor upper-left |
| 2026-06-21 | Chrome extension v0.1.7: job card header dashboard icon + fixed minimize (×) click; session-only position reset on refresh |
| 2026-06-21 | Chrome extension v0.1: MV3 job card + save API + auth bridge; `npm run build:extension` → `dist/extension/`; `app_config.extensionSites` + `extension_job_card` flag |
| 2026-06-21 | Job Tracker: `job_tracker_entries` (`JobTrackerEntry`) + `/dashboard/job-tracker` (v1 chronological list); overview stat **Jobs tracked**; `/dashboard/applications` redirects; extension save API planned |
| 2026-06-21 | Sign-out fix: `signOutUser` uses NextAuth `callbackUrl` redirect (no race with manual `/login` assign) |
| 2026-06-21 | Enhance with AI preflight: button click checks feature flag + `aiEngine.quotas.system.enable` + route/quota before job-description dialog |
| 2026-06-21 | Feature flags: `feature_flags.extra` JSON column for per-flag optional config |
| 2026-06-21 | Feature flags: `feature_flags` key/value table (one row per flag); registry in `feature-flags-service.ts` |
| 2026-06-21 | AI Engine quotas: `app_config.aiEngine.quotas.system.enable` gates system AI; `quotas.customer.aiDailyUnlimited` replaces per-user `users.aiDailyUnlimited` |
| 2026-06-21 | BYOK unlimited auto-sync: `users.aiDailyUnlimited` set `true` on vault (`vaultUserApiKey`), cleared when last key revoked |
| 2026-06-21 | System Gemini key pool v1: per-call `executeWithPoolRetry` (least-calls + round-robin, 3k platform cap fail-fast, Gamma paid overflow); slim `resolveAiRoute`; Pass 2 slot stickiness + `partialEnhance`; `capacity_exhausted` error |
| 2026-06-21 | API observability (Option A): `api_call_logs` table + `src/shared/observability` (`logApiCall`, `[ApiCall]` console); wired to Enhance model calls, engine refinement, BYOK discovery handshake |
| 2026-06-21 | Enhance with AI: default timeout 90s + workload-scaled client wait; in-dialog progress by payload size; `[EnhanceAI]` pipeline `step` + `hint` logs |
| 2026-06-20 | Unified glossy UI system: `DialogContent appearance="glossy"`, `AppAlertDialog`, `GlossyPromoOverlay`, `GlossyFullscreenShell`, `InlineAlert` glass surface — migrated auth, BYOK, enhance AI, onboarding alerts |
| 2026-06-20 | Reusable `LegalDocumentOverlay` + `TermsPrivacyConsent` (glossy in-app Terms/Privacy reader); login consent moved below OAuth buttons |
| 2026-06-20 | AI Engine config: `app_config.aiEngine` (system model + quotas); system Gemini keys in Supabase Vault (`system_api_keys` slots 0–4); per-user `aiDailyUnlimited` BYOK cap bypass; import script `npm run db:import-system-keys` |
| 2026-06-20 | AI Engine: Enhance with AI (header center) in Resume Studio + onboarding Studio; system Gemini key pool + daily quotas (5 enhancements / 20 calls); `/terms` + `/privacy`; login terms checkbox; Settings AI source + privacy copy |
| 2026-06-20 | Onboarding workbench: compact one-line phase headers (Identity, Import, Studio); ATS samples as header links; finalize CTA → **Finalize & continue** |
| 2026-06-20 | Schema consolidation: single `profiles` table with `content` JSONB; dropped `architectures`, child resume tables, unused profile columns |
| 2026-06-20 | Postgres table inventory doc (`docs/TABLE_INVENTORY.md`) |
| 2026-06-20 | Identity phase: LinkedIn URL removed from `CoordinatesPanel`; Studio Header shows empty-state hint; LinkedIn comes from resume parse or Studio edit |
| 2026-06-20 | Dashboard Settings: `/dashboard/settings` — account name edit (`users` only, no profile sync), read-only OAuth email, Google/LinkedIn connect badges, engine status + AI Keys link, sign-out scope copy; `app/actions/account.ts` |
| 2026-06-20 | Dashboard BYOK UX: no hard redirect on missing key; `DashboardIgnitionGuard` resets stale client ignition when `vaultKeyId` null; one-time `DashboardByokNudge`; `BYOK Inactive` on sidebar AI Keys nav; header badge active-only |
| 2026-06-20 | Resume Studio Layout tab: stacked font/page-size fields (label above control); page-size picker limited to **US Letter** + **A4** only |
| 2026-06-20 | Resume Studio UI: right pane **Editor \| Layout** tabs (dashboard profile edit); collapsible ATS-ordered sections + custom sections; transparent ± zoom on preview (auto fit-to-pane when no stored zoom); default page size US Letter; preview typography §2 (18px name, tighter spacing) |
| 2026-06-20 | Dashboard Resume Studio edit: viewport-height shell (`h-svh`) + overflow chain so preview and edit panes scroll independently |
| 2026-06-20 | Studio preview zoom: default 100% (no fit-all-pages), scrollable viewport, +/−/reset controls in `StudioPreviewSettingsBar`; persisted `easysubmit-studio-zoom-v1` |
| 2026-06-20 | Onboarding Studio preview fix: guard scale-to-fit when viewport height is 0, remeasure on phase transition, single preview mount (desktop/mobile), `autoSaveId` split, RefineryPanel reset/watch race |
| 2026-06-20 | Studio font + page-size controls moved to fixed footer at bottom of right edit pane (`StudioPreviewSettingsBar`); left preview is canvas-only |
| 2026-06-20 | Onboarding Studio preview fix: resilient form→preview mapping, live skill sync, resizable panel height chain, dark-theme font/page-size controls |
| 2026-06-20 | Resume parser text normalization (`lib/resume/normalizeResumeText.ts`): strip PDF junk, leading list markers, smart quotes; preserve C++/AT&T/accents; wired through OpenResume, heuristic parser, hub merge, studio DB |
| 2026-06-20 | Shared `ResumeStudioWorkbench`: P2 scale-to-fit paginated preview, page-size select (default A4), dashed page-break lines, resizable 50/50 split (persisted), mobile Preview/Edit tabs; sidebar icon-rail on profile edit |
| 2026-06-19 | Ignition Blast: 400ms mint bloom from clicked power cell + chamber screen-shake, `POWER STABILIZED` JetBrains overlay on `igniteEngineVault` success; post-blast `router.refresh()` + Prime Paper blur→active |
| 2026-06-19 | `/dashboard/keys` Ignition Chamber: 60/40 vault bay + Console power cells (OpenAI→DeepSeek), `EMPTY SLOT` / glowing `CELL ACTIVE.`, grid + engine glow, empty-slot → IGNITE vault entry |
| 2026-06-19 | Dashboard Engine Cold: `vaultKeyId` null → pulsing `BYOK Inactive • Engine Cold` badge, glass hint + Ignition Chamber CTA, blurred resume canvas with Neural Calibration Pending watermark |
| 2026-06-19 | `SynthesisTransition`: full-viewport mint scanning beam, edge→center JSON particle flow, Prime Paper skeleton, JetBrains Mono status copy, 3s `onComplete` → `/dashboard` |
| 2026-06-19 | `docs/database-schema.md`: data model overview — ER diagram, end-to-end flow diagram, feature→table mapping; `ARCHITECTURE.md` links to overview |
| 2026-06-19 | Dashboard AI Keys (`/dashboard/keys`): lists vaulted BYOK per provider, edit/add via embedded Ignition Gate, multi-key + set active |
| 2026-06-19 | Dashboard overview wired to Headless Engine: `getDashboardStats`, `Overview.tsx` (60/40 canvas, Engine Cold, verification from Architecture JSONB, BYOK mint badge) |
| 2026-06-19 | `executeEngineRefinement` (`app/actions/ai/engine.ts`): vault decrypt → Vercel AI SDK Career Architecture refinement → `saveUsageLog`; `VAULT_LOCK` triggers Ignition Gate |
| 2026-06-19 | Gemini BYOK: `@google/generative-ai` SDK ping (`gemini-1.5-flash`, 1 token) + optional REST model enrich |
| 2026-06-19 | Headless Engine schema: `Architecture` (replaces `Engine`), `UsageLog` ledger, `User.vaultKeyId` + `activeProvider` pointers; Career Architecture stores state, not secrets |
| 2026-06-19 | Supabase Vault BYOK: `user_api_keys` + `vault_user_key` / `unvault_user_key` / `revoke_user_key` SQL functions; `lib/vault/user-key-vault.ts` + `app/actions/ai/vault-key.ts` for server-side key persistence |
| 2026-06-19 | Login identity: `users.firstName` / `users.lastName` extracted at OAuth (`lib/auth/extract-login-identity.ts`); session exposes split names; onboarding Coordinates prefill from login profile |
| 2026-06-19 | Identity & boot rules: `docs/IDENTITY_AND_BOOT_RULES.md` — login (`users`) vs resume profile (`profiles`) separation, PKs, OAuth gate, app-load resolver; dashboard nav **Resume profiles** at `/dashboard/resume-profiles` |
| 2026-06-19 | Dashboard BYOK gate: missing local API key after sign-in redirects to `/onboarding?ignition=1` instead of Key Protector overlay; middleware allows `?ignition=1` for completed onboarding users |
| 2026-06-19 | Onboarding sign out: `SignOutButton` in `OnboardingFlowShell` (full-screen top-right + legacy sidebar footer); `lib/auth/sign-out-client.ts` clears onboarding/ignition client storage then NextAuth `signOut` → `/login` |
| 2026-06-19 | Dashboard ignition guard: `restoreIgnitionFromSession` rebuilds model catalog from cache after persist rehydration; guard waits for `_hasHydrated` so valid session keys are not cleared on every `/dashboard` visit |
| 2026-06-19 | `PROVIDER_REGISTRY` expanded to 6 BYOK providers (OpenAI, Anthropic, Gemini, Groq, DeepSeek, OpenRouter) with `handshakeEndpoint`; Ignition Gate provider dropdown + Lucide icons; discovery handshake routes per provider | `getAppConfig("dataRefresh")` interval + `localStorage.lastDiscovery` skip live handshake when cache is fresh; uses `model-cache` catalog for fast Launch |
| 2026-06-19 | `app_config` table + `prisma/seed.ts`: upserts `dataRefresh`, `aiConfig`, `ai_pricing_map`, and `enhanceWithAi` on deploy (`prisma db seed`) |
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
