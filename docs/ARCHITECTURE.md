# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Primary entry after login: `/onboarding`. Marketing site at `/`.

**Screen inventory:** [`docs/SCREENS.md`](./SCREENS.md) — all routes, sidebar labels, Review Screen tabs, extension surfaces, and overlays.

## Data model

Postgres (Prisma) + Supabase Vault BYOK + client Zustand stores. Login identity (`users`) is separate from career data (`profiles` + `content` JSONB). Job search tracking: `job_tracker_entries` (`JobTrackerEntry`) — see [`docs/JOB_TRACKER.md`](./JOB_TRACKER.md). Per-table audit: [`docs/TABLE_INVENTORY.md`](./TABLE_INVENTORY.md).

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Marketing | Next.js 14, Tailwind, dark-first tokens | `/` |
| Web onboarding | Next.js, Framer Motion, Zustand | `/onboarding` (3-phase workbench); legacy aliases redirect here |
| Auth login | NextAuth (Google + LinkedIn OAuth) | `/login` → `/api/auth/[...nextauth]` |
| Auth signup | Supabase Auth (legacy path) | `/auth/signup` |
| Dashboard | NextAuth-protected shell + sidebar nav | `/dashboard` (+ `/dashboard/resume-profiles`, `/dashboard/job-tracker`, `/dashboard/ats-guidelines`, `/dashboard/about`, `/dashboard/settings`) |
| Extension landing | Static marketing | `/extension` |
| Chrome extension | MV3 in-page job card v0.1 | `dist/extension-dev/` (dev) · `dist/extension/` (prod / CWS) |

## Auth & route protection

- **`middleware.ts`** — Auth gate: anonymous → `/` + `/login` only; logged-in `onboardingStep < 4` → `/onboarding` (except `/api/auth/*`, `/api/resume/*`, `/api/profile/*`, `/api/extension/*`); hub `/onboarding` + `/dashboard` use DB-backed layout gates
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
    about/                  Product overview, contact, legal links
    ats-guidelines/         In-app ATS rules + product enforcement reference
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
  DashboardSetupPrompts.tsx   Post-onboarding BYOK + extension install modals (`?setup=1` + opt-in return-visit triggers)
  ExtensionInstallPromptModal.tsx  Glossy install CTA modal (Skip / Chrome Web Store)
  DashboardOverview.tsx       Post-onboarding overview cards
  DashboardFuelBadge.tsx      BYOK active pill when ignition complete
  DashboardIgnitionGuard.tsx  Redirects to /onboarding?ignition=1 when BYOK missing; KeyProtector for auth failures only
lib/dashboard/
  extension-install-prompt-triggers.ts  Pure trigger gates (dashboardVisit, tabFocusReturn, periodicRefresh, setupFlow)
  extension-install-dismiss-storage.ts  Session dismiss after Skip on return visits
lib/extension/
  extension-dashboard-connection.ts     isExtensionConnectedForDashboard (localStorage id + PING)
lib/features/
  index.ts                              resolveFeature entry point (enhance | subscription)
  types.ts                              EnhanceFeatureResolution, SubscriptionFeatureResolution, FeatureName
  resolve-enhance.ts                    Full enhance gate (BYOK/system route, quota, flags, surface)
  resolve-subscription.ts              Subscription plan + upgrade-nudge gate
  enhance-ai-route.ts                  enhanceFeatureRoute helper + isResolvedAiRoute type guard
lib/job-tracker/jd/
  jd-ai-extract-schema.ts              Zod schema for AI JD extraction (generateObject payload)
  jd-ai-extractor.ts                   Layer 3B — AI JD extraction + mergeAIIntoIntelligence
  jd-prompt-segments.ts               JD segment word-limit truncation + Pass 1 draft prompt builder
  skill-canonicalize.ts               MASTER_SKILLS canonicalization (aliases + tokenize fallback)
src/shared/analytics/
  server-dev-capture.ts               Server-side PostHog dev journey capture (fire-and-forget, dev only)
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

## Extension apply pipeline — event-driven (2026-06-25)

Entry: extension card **Apply with EasySubmit**. Pipeline is split into two independent stages — capture responds instantly, tailor runs async, both surfaces react via Supabase Realtime push (no polling).

```
Extension CAPTURE_JOB
  → POST /api/extension/jobs/capture
      → captureJob (lib/extension/apply-pipeline.ts)
          → saveJobTrackerEntry → write CAPTURED → respond immediately
  ← {id, status: "CAPTURED"}

Extension subscribes to per-job Supabase Realtime (subscribeJobStatusRealtime)

Extension TAILOR_JOB_ASYNC (fire and forget; body `{ entryId }` only — JD loaded from DB)
  → POST /api/extension/jobs/tailor
      → tailorJobPipeline (lib/extension/apply-pipeline.ts)
          → runPipelineTailor (lib/extension/pipeline-tailor.ts)
              → resolveSourceProfileForJob
              → enhanceResumeForUserId (variant: pipeline)
              → upsertJobResumeTailor
          → write RESUME_READY  ──► Realtime push → extension card + dashboard update
          → advancePipelineAfterAutofill
          → write READY_TO_APPLY ──► Realtime push → extension shows Apply Assist + dashboard update
```

**Status flow:** `CAPTURED` → `RESUME_READY` → `READY_TO_APPLY` → `APPLIED`

**Realtime:** Both extension (`startJobStatusRealtime` in `extension/src/content/job-realtime.ts`) and dashboard (`useJobTrackerSync`) subscribe to `job_tracker_entries` via Supabase Realtime. DB writes are the events — no polling in the new flow.

**Pipeline bar labels (active segment):**
- `CAPTURED` → "Optimizing resume"
- `RESUME_READY` → "Resume ready"
- `READY_TO_APPLY` → "Ready to ApplyAssist"
- `APPLIED` → all segments complete

**Tailor failure:** job stays `CAPTURED` with `metadata.pipelineError`. Extension and dashboard both see error state via Realtime.

Legacy `POST /api/extension/jobs/pipeline` (`runApplyPipeline`) retained for backward compatibility.

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
| 2026-07-04 | **JD extract dedupe + flag** — capture registers pipeline tracks synchronously (fixes duplicate `generateObject`); in-flight lock per job+hash; `ai_jd_extract_enabled` ON/OFF for JD AI; utility routing skips models that failed structured probes. |
| 2026-07-04 | **Fork/join enhance** — capture starts job track ∥ resume track; light skills merge; slim experience fact ledger for resume AI; full brief/baseline only on AI fail. Dev `/dashboard/pipeline` groups by architecture track. |
| 2026-07-03 | **JD extract speed cap** — BYOK JD routes pinned to per-provider fast utility models (never Opus/O1); 60s timeout on `generateObject`; fixes ~5m JD steps on Anthropic BYOK. |
| 2026-07-03 | **BYOK model health** — `user_api_keys.modelHealth` stores ranked probe results; Ignition vault refresh probes top career-grade models; `resolveAiRoute` + enhance runtime try ranked fallbacks within provider. |
| 2026-07-03 | **Max-ATS enhance** — single AI pass driven by `buildAtsOptimizationSpec()` (same scoring as ATS panel); skills-only baseline when AI runs; full deterministic fallback on AI fail (`ai_pass1` → warning); cross-domain 6-skill cap removed; extension tailor + Review accept title+company when JD short; Review ATS delta cap removed; `partialEnhance` / pass-2 dropped. |
| 2026-07-02 | **Env domains** — `lib/env/env-resolution.mjs`; PostHog admin (`buildPostHogAdminEnv`) isolated from `DATABASE_URL`; `prisma.config.ts` never loads `.env.local`; `docs/rules/env-domains.md`. |
| 2026-07-01 | Extension CWS host permissions — store builds use `extension/cws-host-matches.json` (scoped ATS + career paths) instead of `https://*/*`; adds `activeTab`. |
| 2026-07-01 | Extension build outputs split — `dist/extension-dev/` (localhost) vs `dist/extension/` (prod / CWS only). |
| 2026-06-30 | **AI default on** — `users.aiSourcePreference` default restored to `auto` (new users + null fallbacks); per-user **disabled** toggle unchanged in Settings. |
| 2026-06-30 | **Resume Studio label** — unified user-facing copy (`RESUME_STUDIO_LABEL` in `src/shared/brand.ts`) across Job Tracker, Review Screen, extension card, analytics catalog. |
| 2026-06-30 | **Job Tracker row chrome** — fixed action slots (`tracker-row-chrome.ts`), stall detection + Retry optimize, tailor crash → `pipelineError`; Extension sidebar hidden when connected. |
| 2026-06-29 | **Dashboard Overview** — `/dashboard` pipeline strip + ranked action queue + weekly progress rail (`lib/dashboard/overview-stats.ts`, `components/dashboard/overview/`). |
| 2026-06-29 | **Help Center** — public `/help` with search, 7 topic categories, and article pages (`lib/help/`); linked from marketing nav and footer. |
| 2026-06-29 | **Prod PostHog** — `getAnalyticsConfig` uses static `process.env.NEXT_PUBLIC_*` (Next.js client inlining); `scripts/validate-analytics-env.mjs` fails Vercel prod builds when key missing; `prod:repair-analytics` / `prod:verify-posthog`; deploy uses `--force`. |
| 2026-06-29 | **`run easy` / `run easy prod` pipelines** — numbered steps, `--fast` variants, extension build only on local dev; prod deploy uses prisma validate + Vercel CLI; see `docs/DEVELOPMENT_WORKFLOW.md`. |
| 2026-06-29 | **Prod deploy runbook** — `DEPLOYMENT_TROUBLESHOOTING.md`; Vercel-only prod env; `DIRECT_URL` session pooler for migrate; no `directUrl` in `prisma.config.ts`; GitHub CI placeholder DB URLs only. |
| 2026-06-28 | **Onboarding manual resume path** — Import phase (`FuelPanel`) supports skip upload → Studio with Phase 1 identity prefilled via `coordinatesToRefineryForm`; analytics `onboarding_import_skipped`. |
| 2026-06-28 | **BYOK health + trace accuracy** — `key_invalid` no longer fires when recent BYOK calls include successes; quota errors excluded from key-error health; `enhance:trace` reports partial success when resume enhanced but JD extract failed. |
| 2026-07-03 | **ATS platform strategy layer** — unified URL detection (`src/shared/ats-platform-detection.ts`), 27-platform rules with strategy archetypes, platform-aware readiness scoring + enhance brief instructions, ATS panel platform tip; capture persists fingerprint via `resolveJobTrackerPlatform`. |
| 2026-06-28 | **Gemini model policy + 503 resilience** — JD extract defaults to `gemini-2.5-flash-lite`; resume `generateText` uses `gemini-2.5-flash` with jittered 503 backoff (5×, 2s–45s) and `flash-lite` fallback + prompt clip; system pool resume calls use `route.modelId` not slot model. |
| 2026-06-28 | **PostHog action events** — pricing CTAs, plan selection, tutorials, ATS score/guidelines, document export, studio tabs, settings sections — see `docs/analytics-option-a.md` |
| 2026-06-28 | **PostHog screen coverage** — `screen_viewed` on every route + overlay via `trackScreenView` / `trackScreenOverlay` (`src/shared/analytics/screen-events.ts`); pairs with `[ScreenDiag]` — see [`SCREENS.md`](./SCREENS.md) |
| 2026-06-28 | **Screen diagnostics** — `[ScreenDiag]` high/low/light on every route + overlay (`screen-diagnostics.ts`, `ScreenDiagnosticsTracker`); catalog in [`SCREENS.md`](./SCREENS.md) |
| 2026-06-28 | **Screen inventory** — [`docs/SCREENS.md`](./SCREENS.md): canonical routes, sidebar labels, Review Screen tabs, extension surfaces; linked from FLOW, ARCHITECTURE, PROJECT_STATE |
| 2026-06-28 | **BYOK enhance observability** — customer-route model failures now write `api_call_logs` + `[EnhanceDiag]`; `enhanceMeta` persists `aiAttempted`/`aiSucceeded`/`warning`; routing respects `forceSystem` / `aiSourcePreference=system` over vault key |
| 2026-07-04 | **JD utility model routing** — JD extract tries structured-probe verified fast models first, then resume-grade fallbacks; system pool uses `jdExtractionModelId` |
| 2026-07-04 | **Unified AI model routing** — JD extract and resume enhance share vault key discovery + `withCustomerModelFallback`; Workday segmenter + prompt fallback |
| 2026-06-28 | **JD Brain extract fix** — system pool uses `jdExtractionModelId` (not slot resume model) for `generateObject`; Gemini BYOK routes JD extract to utility model; text+JSON fallback on parse fail; extension pipeline persists `enhanceMeta`. |
| 2026-06-28 | **Enhance diagnostic logging** — `[EnhanceDiag]` per-transaction logs with JD/resume/gate tracks, G1–G6 gate params, `app_config.enhanceDiagnostics` threshold (`light`/`low`/`high`); documented in [`enhance-pipeline-design.md`](./enhance-pipeline-design.md) observability section. |
| 2026-06-27 | **Enhance QA playbook** — [`docs/enhance-qa-playbook.md`](./enhance-qa-playbook.md): repeated AI on/off review protocol, defect registry (D-01–D-22), Case 001 findings, phased fix plan. |
| 2026-06-27 | **Enhance QA fixes (Phases 1–6)** — skill filter (`jd-skill-filter.ts`), summary identity/grounding, coherence warnings + ATS cap on cross-domain, domain signals (procurement/medtech), Case 001 regression test; Review UI shows AI-off confirm + coherence notes. |
| 2026-06-27 | **Cross-domain summary builder** — `cross-domain-summary.ts`: identity + resume-native skills + experience-anchored transferable bridge; JD keywords skills-section only (Rezi/ResumeAdapter career-bridge model). |
| 2026-06-27 | **AI-off enhance polish** — generic profile title defers to experience role; metric bullet selection (`summary-bullet-pick.ts`); cross-domain JD skills capped (6) with min resume-native slots (5); summary S3/S4 truncation fixes. |
| 2026-06-27 | Extension scrape loading — popup THIS TAB + GET_TAB_STATUS aligned; API intercept + SPA URL change refresh in-place loading |
| 2026-06-27 | Extension card — show Reading job details loading state until JD scrape enables Apply (not disabled button + hint) |
| 2026-06-27 | Extension scrape — reject generic hub titles (`Jobs`, `Careers`, etc.) so card/popup no longer show browse-page nav labels as role names |
| 2026-06-27 | Extension apply + profile setup — resume interrupted apply after mandatory profile setup finishes (`pendingApplyAfterProfileSetup`) |
| 2026-06-27 | Extension popup polish — card-matched brand bar, lite frame shell, header icon actions; redundant footer Settings + Open Job Tracker removed |
| 2026-06-27 | Extension popup Part 2 — launcher redesign (account chip, THIS TAB, stats via `GET_JOB_STATS`, settings link; one-click toggle removed) |
| 2026-06-27 | Extension Part 1 — force-show → manual capture (Save to tracker CTA, no_job Add manually, loading timeout → manual, `GET_TAB_STATUS` for popup) |
| 2026-06-27 | Extension popup v1 redesign spec — competitor research + state-machine UI in `docs/EXTENSION_POPUP_REDESIGN.md` (no one-click toggle) |
| 2026-06-27 | Product decision — one-click apply **will not ship**; see `docs/decisions.md` |
| 2026-06-27 | Settings proactive expansion — pending action items (missing API key, AI off, incomplete name) auto-expand their section on `/dashboard/settings`; logic in `lib/dashboard/settings-action-items.ts` |
| 2026-06-27 | JD AI observability — `callEnhanceObjectModel` → `api_call_logs` (`ai.enhance.generate_object`); JD extract quota pre-check + `aiCallsToday` increment; `aiEngine.system.jdExtractionModelId` (BYOK uses vaulted model) |
| 2026-06-27 | Extension install prompt config — `app_config.extensionInstallPrompt` trigger flags (`dashboardVisit`, `tabFocusReturn`, `periodicRefresh`, all default `false`); `DashboardSetupPrompts` + session dismiss on Skip; `?setup=1` always → tutorials; logic in `lib/dashboard/extension-install-prompt-triggers.ts` |
| 2026-06-27 | PostHog mirrors every `api_call_logs` row as `api_call_logged`; extension emits `ui_interaction` on card clicks — see `docs/analytics-option-a.md` |
| 2026-06-28 | Two-path production deploy — Vercel (web) + GitHub Actions `deploy.yml` (Chrome Web Store); see `docs/DEPLOYMENT.md` |
| 2026-06-27 | `run easy` / `run easy prod` — `npm test` + extension dev build on local dev; prod via Vercel `vercel-build`; see `docs/ENV.md` |
| 2026-06-27 | Dev-only resume journey observability — `resume_journey_step` in PostHog dev project (488025); `[EnhanceAI]` console gated off in production |
| 2026-06-27 | Extension AI health — system-quota users without BYOK no longer blocked by spurious `key_missing` health check |
| 2026-06-27 | JD Brain Layer 3B — `generateObject`+Zod JD extract, MASTER_SKILLS canonicalization, segment-based Pass 1 JD (req+resp ≤4k), Pass 2 culture/gap/verb guardrails, `traceId` jdIntelligence logging |
| 2026-06-27 | Onboarding Studio validation — live `validateResume` banner + field highlights after parse; errors Studio-only; cleared on Import back / re-upload |
| 2026-06-27 | `app_config.dashboardTutorialVideos` — configurable YouTube titles/URLs for `/dashboard/tutorials` |
| 2026-06-27 | Video Tutorials — `/dashboard/tutorials` with six YouTube embeds; sidebar nav above Settings; post-setup auto-nav after extension modal (`?welcome=1`) |
| 2026-06-27 | Extension install guard (superseded) — early `DashboardExtensionGuard` redirect experiment; replaced by opt-in `DashboardSetupPrompts` modals + `/dashboard/extension` reference page |
| 2026-06-27 | Dashboard profile menu — landing-style avatar dropdown on all dashboard screens except Settings (logout only); Settings keeps sign-out pill |
| 2026-06-27 | Dashboard About page — product overview, how-it-works steps, extension CTA, ATS Guidelines cross-link, consolidated support contact; workspace header labels per route |
| 2026-06-27 | New resume profile upload — `/dashboard/resume-profiles/new` third option reuses onboarding `FuelPanel` (PDF/DOCX parse → `createResumeProfileFromParsed` → Studio); edit-existing profiles unchanged |
| 2026-06-27 | Dashboard ATS Guidelines page — page length (Auto/Studio/AI off-on), bullet budgets, product enforcement + gaps vs `RULES.md` |
| 2026-06-27 | Resume Studio Layout — profile `pageLengthPreference` (Auto \| 1 \| 2 pages, default Auto) drives enhance bullet budgets + validation |
| 2026-06-27 | Marketing nav signed-in — hero **Dashboard** CTA before profile menu (dropdown keeps Settings + Log out) |
| 2026-06-27 | **North-star resume enhance shipped** — `runResumeEnhancePipeline`, JDSkillsFramework, grouped skills, JD weave, soft AI gates, `enhanceMeta` persist, coverage UI — [`docs/north-star.md`](./north-star.md) |
| 2026-06-27 | North-star enhance spec — 3-phase pipeline design, three intelligence frameworks (Features / O\*NET Role Skills / **JDSkillsFramework**), grouped skills policy, work inventory §24 — [`docs/north-star.md`](./north-star.md) |
| 2026-06-27 | Deterministic enhance hardening — no double-verb bullet stacking, `cleanBulletsString` on experience, recency taper in `applyEnhancePlan`, mashed-role split on PDF import (`split-mashed-experience.ts`) |
| 2026-06-27 | Experience bullet recency rules — `lib/resume/experience-bullet-rules.ts` (recent/mid/older taper, min 3 on recent role); AI enhance prompts, Studio validation, readiness score, export warnings; `RULES.md` §6.3 aligned to max 6 hard cap |
| 2026-06-26 | Prod cutover checklist — `docs/PROD_CUTOVER.md` (DB/P3009, Vercel env, Google OAuth prod todo, storage, smoke tests); OAuth local client recreated — prod redirect URIs still required |
| 2026-06-26 | OAuth setup doc — `docs/oauth-setup.md` (Google Cloud from scratch, redirect URIs, env vars, troubleshooting); linked from `ENV.md` + `FLOW.md` |
| 2026-06-26 | Login UI — `/login` LinkedIn-first OAuth buttons + muted “LinkedIn is preferred” hint below terms consent |
| 2026-06-26 | AI settings (Prompt 03) — `aiSourcePreference` adds `disabled`; env `EASYSUBMIT_AI_GLOBALLY_ENABLED` + `NEXT_PUBLIC_AI_GLOBALLY_ENABLED`; router `ai_disabled` / `ai_globally_disabled` → deterministic resume enhance; Settings Enable/Disable toggle; review + extension “Enhance” label when AI off |
| 2026-06-26 | Deterministic fallback (Option 1) — `EnhancePlan` + `applyEnhancePlan` use JD Brain `mustAddSkills` (not raw keyword-gap tokens); summary flagged, not rewritten on fallback |
| 2026-06-26 | System AI kill switch — `feature_flags.system_ai_enabled` replaces `app_config` enable gate; user Settings unchanged (AI source, one-click, resume picker) |
| 2026-06-26 | Skills quality rules — shared `lib/resume/skills-rules.ts` (count gates, banned slot-wasters, prose detection); enforced in AI post-process, deterministic enhancer, readiness score, and StudioSkillsField |
| 2026-06-26 | Professional Summary quality rules — shared `lib/resume/summary-rules.ts` (4 sentences, 70–80 words, banned phrases); enforced in AI enhance post-process, deterministic enhancer feedback, readiness score, and RefineryPanel live hints |
| 2026-06-26 | Extension resume/cover detail toolbar — Resume Studio on second row, sparkles Enhance with AI (edit → enhance → DOC → PDF), preview panel widens to 400px and resets on Back |
| 2026-06-26 | Onboarding avatar upload fix — `/api/profile/*` exempt from middleware onboarding redirect (POST was redirected to `/onboarding` → 500) |
| 2026-06-26 | Dashboard/onboarding redirect loop fix — middleware defers hub gates to DB-backed layouts (`dashboard-session-gate`); JWT `onboardingStep` alone no longer bounces `/dashboard` ↔ `/onboarding` |
| 2026-06-25 | Extension resume/cover detail toolbar — single icon row: back, edit/save/discard, PDF+Word download, Resume Studio; new extension DOCX export API routes |
| 2026-06-25 | Extension card layout tokens — `card-layout-tokens.ts` (16px inset, CTA zone divider, shared spacing for summary + detail views) |
| 2026-06-25 | Extension card detail UX — summary labels Job Info / Resume / Cover Letter; detail headers **Resume Studio** → Review Screen tab; job/cover/resume inline Edit+Save; cover full textarea + resume lite fields fetched lazily on Edit; preview iframe fills resized panel |
| 2026-06-25 | Button purposes — `ButtonPurpose` + `webButtonPurposeProps` / `extensionButtonClass`; semantic parity, surface-specific colors; `PurposeButton` on web |
| 2026-06-25 | Extension button system — `src/shared/brand-buttons.ts` (`.es-btn-primary/secondary/chip`); Job info → secondary button; onboarding Continue uses web `Button` |
| 2026-06-25 | Unified brand colors — `src/shared/brand-colors.ts` (engine glow) drives logo SVG, web `LogoIcon`, extension card/popup/nudge CSS; legacy teal removed from extension |
| 2026-06-25 | Extension pipeline tailor — uses `enhanceWithAiResumeProfile` (not one-click apply flag); dashboard/PDF no longer show base profile as if tailored when per-job tailor is missing |
| 2026-06-25 | Extension auto-applied fix — confirmation watch only on apply/thank-you URLs; job posting pages no longer false-positive to APPLIED while READY_TO_APPLY |
| 2026-06-25 | Extension apply gate — `isExtensionApplyBlockedByAiHealth` disables **Apply with EasySubmit.ai** on AI health errors; capture/tailor/pipeline APIs return 403 until fixed |
| 2026-06-25 | Extension card header — refresh icon re-fetches config, journey status, and resume profiles without a full page reload |
| 2026-06-28 | BYOK AI health — ignore ApiCallLog + last-job key failures before active vault key `updatedAt`; lookup cutoff by `activeProvider` (fixes stale banner after Replace key); sync `users.vaultKeyId` when replacing active provider; Settings refreshes AI health after vault save |
| 2026-06-25 | Extension AI health — refresh runtime config on tab focus/visibility so dashboard settings fixes clear the card banner without a full page reload |
| 2026-06-25 | Extension AI health — red text banner below card header (right-aligned message + dashboard fix link); header icon removed |
| 2026-06-25 | AI health alert placement — dashboard header rightmost; extension card grip order resume → refresh → settings → close |
| 2026-06-25 | Extension job card — single expandable card: summary rows (title, company + Job info, Resume/Cover chips, status above CTA); inline scroll views for job details + resume/cover preview; header ↗ opens dashboard review; `GET /api/extension/jobs/:id/preview` |
| 2026-06-26 | Extension tailor API loads job row by `entryId` only (no duplicate JD JSON in request); dev `run easy` sets `NODE_OPTIONS=--max-old-space-size=4096` |
| 2026-06-26 | Extension application profile setup gates Apply — mandatory Screen 1 must be saved before pipeline/autofill; setup re-shown on every Apply click until `workAuth` + `preferences` persist |
| 2026-06-25 | Dashboard AI health alert — `GET /api/user/ai-health` + refresh on tab visibility, focus, pageshow, and 60s poll (replaces client server-action calls) |
| 2026-06-25 | Global AI health alert — `getAiHealthStatusForUser` / `AiHealthAlert` in dashboard header; `aiHealthError` on extension config + card tooltip; Settings split into AI Keys + General |
| 2026-06-25 | Extension pipeline hardening — re-capture resets row to CAPTURED; `markJobTrackerApplied` only from READY_TO_APPLY; content script `__easysubmitCleanup` teardown; BYOK health uses `aiMode: customer` in ApiCallLog |
| 2026-06-25 | Event-driven apply pipeline: split into `/capture` (instant) + `/tailor` (async); per-job Supabase Realtime push replaces extension polling; `captureJob` + `tailorJobPipeline` in `apply-pipeline.ts`; `subscribeJobStatusRealtime` in `realtime-sync.ts`; `startJobStatusRealtime` in `job-realtime.ts` |
| 2026-06-25 | Pipeline bar active segment labels dynamic: CAPTURED→"Optimizing resume", RESUME_READY→"Resume ready", READY_TO_APPLY→"Ready to ApplyAssist" via `pipelineActiveSegmentLabel` |
| 2026-06-25 | Extension key/quota failures: specific card badge + message + Open Settings deeplink (`resolveKeyFailurePresentation`, `DashboardKeyFailureAlert` on web) |
| 2026-06-23 | Job tracker sync: fast poll (3s) includes `RESUME_READY`; realtime-token routes return 503 when Supabase Realtime is not configured |
| 2026-06-23 | Extension content script: graceful teardown on invalidated context — stop polling/url watchers, swallow unhandled rejections, no console spam after reload |
| 2026-06-23 | Phases 6–12 application profile + PDF inject + confirmation detect (3-signal) + tracker journey UI via `resolveJourneyDisplay` |
| 2026-06-23 | Journey display mapper simplified: `resolveJourneyDisplay(status, hasError)` → `{ stage, label, applyButtonState, showResumeCard, showAssistCard }` per SYNC_ARCHITECTURE state map |
| 2026-06-23 | On-demand extension PDFs: `GET /api/extension/jobs/:id/resume-pdf` + `cover-letter-pdf`; `file-inject.ts` DataTransfer upload; `application-profile-resolve` step 5 with fieldType |
| 2026-06-23 | Application profile: `PATCH /api/extension/user-prefs` JSONB merge for `applicationProfile`; extension setup Screens 1–2 on first Apply (parallel to pipeline); field-resolution step 5 `application_profile`; journey display `applyButtonState` + `showAssistCard` |
| 2026-06-23 | Journey lifecycle: active row lookup by most recent non-archived urlHash; re-apply archives APPLIED row + fresh CAPTURED; `customizeResume` pipeline short-circuit; Realtime sync hook + token APIs; `resolveJourneyDisplay` Re-apply state |
| 2026-06-23 | Application profile schema: `users.customizeResume`, `users.applicationProfile` JSONB; `JobTrackerEntry` drops `@@unique([userId, urlHash])` for re-apply — migration `allow_multiple_journeys_per_url` |
| 2026-06-23 | Full journey sync: State 0 manual capture, Stage 2 two-card assist, extension Realtime, `?es_open=assist`, `MARK_APPLIED`, Layer B apply gate — `docs/SYNC_ARCHITECTURE.md` |
| 2026-06-23 | Journey sync v1: Apply always runs pipeline+tailor (all platforms); server auto-advance to `READY_TO_APPLY`; `resolveJourneyDisplay`, Realtime token APIs, `useJobTrackerSync` |
| 2026-06-23 | `docs/SYNC_ARCHITECTURE.md` audited vs codebase: State 0 locked (Apply-only, 0a/0b/0c), current-vs-target gaps, extension Realtime auth, build order |
| 2026-06-23 | Extension card: auto-detect calls `removeCard()` when `isJobPage` false; manual open from popup shows “Job not detected” state |
| 2026-06-23 | `extension_global_switch` is first gate: content script skips boot when off; extension APIs return 503; replaces `extension_job_card` |
| 2026-06-23 | Renamed `users.oneClickApply` → `autoApplyUserSwitch` (per-user auto-apply toggle; pairs with `extension_auto_apply` flag) |
| 2026-06-22 | Extension API intercept loads `api-intercept-page.js` via `script.src` (CSP-safe on Workday and other strict `script-src` sites) |
| 2026-06-22 | Field Memory v1: `user_application_answers` table, extension capture bridge (`__easysubmit_field_capture__` → `POST /api/extension/application-answers/capture`), lookup GET API |
| 2026-06-22 | `app_config.legalDocuments` — Terms of Service and Privacy Policy copy (structured blocks) for `/terms`, `/privacy`, and login overlay; seeded from `legal-documents-defaults.ts` |
| 2026-06-22 | Application Field Memory spec + agent coordination (`docs/APPLICATION_FIELD_MEMORY.md`, `docs/ACTIVE_WORK.md`) — learn Workday answers in DB, reuse on similar fields |
| 2026-06-22 | Extension detection v2: `page-classifier` hub taxonomy (CVS Phenom fix), Phase 1 adapters (Lever/Ashby/iCIMS/SR/Taleo/Jobvite), `extension:detect-eval` CLI + negative URL matrix — see `docs/EXTENSION_DETECTION.md` |
| 2026-06-22 | `app_config.resumeProfiles.maxProfilesPerCustomer` (default 20) — per-user resume profile cap enforced on create + job-tailor clone; dashboard shows count/limit |
| 2026-06-22 | Review Screen ATS Analysis tab: readiness score (4 pillars), keyword gap, bullet quality, robot parse view; shared `resume-content-model` for HTML/PDF/Word/ATS exports |
| 2026-06-22 | ATS-quality resume exports: `resume-docx` + `resume-pdf` via `resume-content-model` + `resume-style`; Review export async wiring |
| 2026-06-22 | Review Screen Resume Studio (`?from=review`): hides dashboard sidebar, Review Screen header/tabs chrome, no tailor banner; save returns to Review Resume tab; pipeline Resume Studio link unchanged |
| 2026-06-22 | Review Screen Resume + Cover document tabs: shared toolbar (Resume Studio / Enhance / PDF / Word / LaTeX), cover inline edit + `job_resume_tailors` document fields, LaTeX fullscreen editor (validate + HTML preview), server actions in `app/actions/review-documents.ts` |
| 2026-06-22 | Review Screen Resume tab: inline merged `PrimeResume` preview, tailored-section pills, Resume Studio; `getJobTrackerEntryById` loads `tailoredResumePreview` |
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
| 2026-06-27 | Product analytics Option A: PostHog (`src/shared/analytics`, web + extension events, replay/errors); web autocapture via `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE`; Pino server logs; spec `docs/analytics-option-a.md`; dev/prod PostHog projects 488025/488042 |
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
| 2026-06-25 | Resume tailor/export pipeline logging — `TAILOR_PIPELINE` + `EXPORT_PIPELINE` steps on `[EnhanceAI]` traces; per-step delta (summary/skills/bullets) on enhance, tailor, and PDF/DOCX export |
| 2026-06-25 | Resume export spacing — separate `DOCX_SPACING` / `PDF_SPACING` in `resume-style.ts`; DOCX ~2× section gaps; PDF tighter; mashed company/date split via `resolveResumeEntryTitleLine`; `afterSectionBody` wired in DOCX body paragraphs |
| 2026-06-25 | Extension journey state machine — 5 states (0=unsaved, 1=CAPTURED, 2=RESUME_READY, 3=READY_TO_APPLY, 4=APPLIED); `BRAND.autoSuggestCta` added; `resolveJourneyDisplay` updated with correct labels/button states per state; `showUpdateResume` removed; `is-live` animation gated on `!APPLIED`; "Apply" tab removed from Review Screen |
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
