# Project State

**Screen inventory:** [`SCREENS.md`](./SCREENS.md) — canonical list of routes and UI screen names (landing, dashboard, Review Screen, extension).

## Completed

- **Product analytics (Option A)** — PostHog web + extension instrumentation (`src/shared/analytics`); dev/prod projects 488025/488042; Pino server logs; spec [`docs/analytics-option-a.md`](./analytics-option-a.md); Postgres AI ops unchanged (`api_call_logs`)
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
- **Login UI** — Google + LinkedIn OAuth on deep navy glass card (LinkedIn listed first); muted “LinkedIn is preferred” below terms; `SessionProvider` via `components/providers/auth-provider.tsx`; marketing **`Navbar`** shows Sign In when anonymous, signed-in **profile avatar menu** (Dashboard / Settings / Log out) when authenticated
- **Sign out** — `components/auth/SignOutButton.tsx` + `lib/auth/sign-out-client.ts`; onboarding routes via `OnboardingFlowShell`; dashboard **profile avatar menu** (`NavbarProfileMenu`: Settings + Log out) on workspace screens except Settings and Resume Studio; Settings keeps mint **Sign out** pill in header; other dashboard screens show **BYOK KEY** header CTA when engine is cold
- **Onboarding hub** — `/onboarding`: 3-phase Unified Workbench with unified top chrome (`OnboardingWorkbenchChrome`: EasySubmit brand + phase label/description + phase actions + Sign Out, progress bar, Identity \| Import \| Studio tabs); Import phase **Skip upload — build resume manually** (`FuelPanel.onSkipManual` → Studio with identity prefilled); finalize CTA **Finalize & continue**; ATS sample PDF/DOCX in Import + Studio header actions; Studio validation runs **proactively after parse** (`ValidationErrorsBanner` + section highlights on Studio only, cleared when leaving Studio or re-uploading); Studio header: sample PDF/DOCX, raw text, expand/collapse, Import back
- **Resume spec** — … **`lib/resume/experience-bullet-rules.ts`** — recency-based bullet budgets; **deterministic enhance** splits mashed PDF roles, normalizes verb openings (no `Led lead` stacking), cleans spacing, tapers bullets by recency when AI is off
- **Open-Resume parser** — PDF via browser Open-Resume engine; **DOCX → PDF** via `docx-to-pdf-wasm` on `/api/resume/convert-docx`, then same PDF parser; heuristic DOCX fallback if conversion parse fails; parsed text normalized via `lib/resume/normalizeResumeText.ts` (junk chars, list markers, smart quotes)
- **Onboarding workbench** — `/onboarding` is the default post-login entry: 60/40 split (Coordinates → Fuel → Refinery), full-screen shell (no sidebar); `/onboarding/step-1` and `/onboarding/workbench` redirect here
- **Resume Studio workbench** — shared `ResumeStudioWorkbench` (onboarding phase 3 + dashboard profile edit): 50/50 resizable split; left preview with auto fit-to-pane zoom (first visit), transparent ± overlay, thin page separators; **dashboard only** — right pane **Editor \| Layout** tabs (onboarding uses Identity → Import → Studio breadcrumb only); Layout = font + page size + **resume length (Auto \| 1 \| 2 pages, default Auto)**; Editor = collapsible ATS sections (+ custom sections), onboarding and **resume profile Studio** expand Profile role (profile only) + Header + Skills + Experience by default; optional sections collapsed; **mandatory validation** (error severity only — not warnings) shows red borders on sections and fields proactively in onboarding, resume profile Studio, and job review Studio; zoom `easysubmit-studio-zoom-v1`, page size `easysubmit-page-size-v1`
- **Onboarding flow shell** — asymmetric layout for legacy route wrappers; full-screen bypass for `/onboarding`
- **Codebase cleanup** — removed legacy 11-step wizard, alternate refinery/workbench UIs, TanStack `start/` app, orphan layout/visual components; minimal `components/ui` set retained
- Supabase Auth signup (`/auth/signup`) — legacy email/OAuth path
- `finalizeProfile` — Zustand payload → Prisma Postgres
- **Job Tracker (web v2)** — … **Review Screen** modal: Resume + Cover tabs share full-bleed preview, overlay toolbar (dark chrome), zoom controls; **ATS Analysis** tab (readiness score, keyword gap, bullet quality, robot parse view); resume PDF/Word export via `resume-content-model` + `resume-style`; Cover inline edit + Save, **Enhance with AI** (cover brain + quota), pipeline seeds **deterministic** 4-part cover (~300 words, no AI credits) on tailor; LaTeX editor; `reviewDocuments` on `job_resume_tailors`; …
- **Journey sync (extension ↔ app)** — State 0 manual capture, two-card apply assist, Realtime + poll sync, `?es_open=assist`, `MARK_APPLIED` — see [`docs/SYNC_ARCHITECTURE.md`](./SYNC_ARCHITECTURE.md)
- **Application profile (extension)** — one-time setup Screens 1–2 on first Apply (parallel to pipeline); `PATCH /api/extension/user-prefs` JSONB merge; autofill step 5 from `applicationProfile`; on-demand resume/cover PDF endpoints + file upload injector — see [`docs/APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md)
- **Chrome extension v0.1** — MV3 single expandable job card (summary **Job Info / Resume / Cover Letter** + inline detail views); resume/cover detail toolbar (back, edit, **Enhance with AI** sparkles, DOC+PDF download, **Studio Edition** deeplink on second row); preview panel auto-widens to 400px and resets on Back; job fields + cover letter (full inline edit) + resume (lite field edit on demand); preview iframe fills resized panel; 5-state journey (0=unsaved→"Apply with EasySubmit.ai", 1=CAPTURED→no CTA, 2=RESUME_READY→"Apply with Auto Suggest" disabled, 3=READY_TO_APPLY→"Apply with Auto Suggest" active, 4=APPLIED→completed); pipeline on all platforms; manual capture form; AI health issue as right-aligned red banner below card header; **`app_config.forceUpgrade`** min-version gate (in-card update banner + HTTP 426 on extension APIs); `is-live` shell animation stops at APPLIED; auto-detect application confirmation via URL patterns + body phrases
- **Review Screen** — tabs: Job | Resume | Cover letter | ATS Analysis (Apply tab removed); READY_TO_APPLY defaults to Resume tab
- **Dashboard shell** — `/dashboard`: Lovable-derived sidebar layout (`DashboardShell`), overview with stats/recent Job Tracker entries/ATS Guarantee (`DashboardOverview`); **Extension install prompts** — `DashboardSetupPrompts` on every dashboard route: post-onboarding **`?setup=1`** BYOK modal → extension modal → Video Tutorials (skip, close, or connect all exit to tutorials); return-visit modal **opt-in** via **`app_config.extensionInstallPrompt`** (`dashboardVisit`, `tabFocusReturn`, `periodicRefresh` — all default `false`); Skip dismisses for session on return visits; full-page reference at **`/dashboard/extension`** (Chrome Web Store CTA, connect bridge); optional cold-engine AI key card; **Resume profiles** at `/dashboard/resume-profiles` — multi-profile list (target role primary label, person name subtitle), Edit / Set default / Delete (when >1), `+` → copy default, start blank, or **upload resume** (onboarding `FuelPanel` parse) → Studio editor at `/dashboard/resume-profiles/[id]/edit`; onboarding default profile marked `isDefault`; **Settings** at `/dashboard/settings` — pending setup actions (missing API key, AI off, incomplete name) auto-expand their section; account names auto-save (600ms debounce), **AI enhancements** toggle + vaulted provider keys (list + add-key modal via `SettingsVaultKeysPanel`), extension prefs, OAuth connect badges, sign out in header; header **BYOK KEY** when engine cold (opens add-key modal); **About** at `/dashboard/about` — product overview, how-it-works, extension install CTA, support contact, legal links; **ATS Guidelines** at `/dashboard/ats-guidelines`; workspace header shows route-specific label (About, ATS Guidelines, Extension, Settings, etc.); header `BYOKStatusBadge` when vaulted or **BYOK KEY** CTA when cold on non-Settings screens (links to Settings `?addKey=1`); **AI health notice** under BYOK in header; overview **Your AI Key** card shows issue state when cold; sidebar **Settings** shows `Add key` badge when cold; one-time BYOK nudge on first dashboard load (skipped on extension install screen)
- **Multi resume profiles** — many `profiles` per login with `isDefault`; structured resume in `profiles.content` JSONB; engine/stats read default profile; `app/actions/resume-profiles.ts`; cap **`app_config.resumeProfiles.maxProfilesPerCustomer`** (default 20) with dashboard count + disabled add at limit
- **Login identity** — `users.firstName` / `users.lastName` extracted at OAuth; session + onboarding Identity prefill; resume edits no longer write `users`
- **Profile model** — `Profile` (many per `User`, one `isDefault`) with `content` JSONB for all resume sections + `calibrationScore`; multi-provider email linking via NextAuth
- Marketing landing (`/`) — signed-in nav shows hero **Dashboard** CTA before profile menu; extension page (`/extension`)
- **JD AI observability (2026-06-27)** — `callEnhanceObjectModel` writes `api_call_logs` (`ai.enhance.generate_object`); JD extract pre-checks quota before `generateObject`; JD calls increment `aiCallsToday`; `app_config.aiEngine.system.jdExtractionModelId` for system pool (BYOK keeps vaulted model)
- **North-star resume enhance pipeline (2026-06-27)** — `runResumeEnhancePipeline`: Phase 1 brief → Phase 2 baseline (grouped skills JD \| resume, JD weave) → Phase 3 optional AI; soft gates (quota/no-key = baseline + warning); **JDSkillsFramework** (`fetchJdSkillsVocabulary`); `EnhanceCoveragePanel`; PostHog `engine_mode` / coverage fields — spec [`docs/north-star.md`](./north-star.md)
- **Enhance QA integrity (2026-06-27)** — Summary identity split (`summaryIdentity` vs JD title), junk-skill filter, ungrounded-claim strip, cross-domain coherence warnings + capped ATS delta in Review; playbook [`docs/enhance-qa-playbook.md`](./enhance-qa-playbook.md)
- **Gemini model policy + 503 resilience (2026-06-28)** — JD extract defaults to `gemini-2.5-flash-lite`; resume `generateText` uses `gemini-2.5-flash` with jittered 503 backoff (5×, 2s–45s) and `flash-lite` fallback + prompt clip (`src/lib/ai/engine/gemini-resilience.ts`); system pool resume calls use `route.modelId` not slot model
- **Enhance diagnostic logging (2026-06-28)** — `[EnhanceDiag]` per-transaction logs (JD / resume / gate / engine / persist tracks); G1–G6 gate params; `app_config.enhanceDiagnostics` threshold (`light`/`low`/`high`, default `light` = all); spec [`docs/enhance-pipeline-design.md`](./enhance-pipeline-design.md) observability section
- **JD Brain Layer 3B (2026-06-27)** — `jd-ai-extractor.ts`: `generateObject`+Zod structured extraction (`jd-ai-extract-schema.ts`); `mergeAIIntoIntelligence` case-insensitive dedup; MASTER_SKILLS canonicalization (`skill-canonicalize.ts`); segment-based Pass 1 prompt builder (`jd-prompt-segments.ts`); dynamic import in `jd-brain.ts` keeps sync module graph clean
- **Extension install prompt config (2026-06-27)** — `app_config.extensionInstallPrompt` DB table (`20260627140000_extension_install_prompt_config`); pure trigger logic in `lib/dashboard/extension-install-prompt-triggers.ts`; session dismiss on Skip; all triggers default `false`
- **One-click apply cancelled (2026-06-27)** — product decision: will not ship Workday/platform one-click pipeline; legacy flags/UI to be removed over time — [`decisions.md`](./decisions.md)
- **Analytics server dev capture (2026-06-27)** — `src/shared/analytics/server-dev-capture.ts`: fire-and-forget PostHog `/capture/` from server (dev project 488025 only); used by `logJourneyStep` for pipeline events; never fires in production

## Active work

- Extension v1 prod — **Part 2 shipped:** popup launcher redesign (`GET_JOB_STATS`, account chip, THIS TAB, settings); Part 1 manual capture live ([`docs/EXTENSION_POPUP_REDESIGN.md`](./EXTENSION_POPUP_REDESIGN.md))
- Extension v2 — Tier 1 ATS adapters (Lever, Ashby, iCIMS, SmartRecruiters, Taleo, Jobvite); detection architecture in [`docs/EXTENSION_DETECTION.md`](./EXTENSION_DETECTION.md)
- **Production deploy (Vercel)** — **deferred** (OAuth prod callbacks done; Vercel/env/migrate when ready)
- **Application Field Memory** — spec in [`docs/APPLICATION_FIELD_MEMORY.md`](./APPLICATION_FIELD_MEMORY.md); agent lanes in [`docs/ACTIVE_WORK.md`](./ACTIVE_WORK.md)

Full tracker: [`docs/JOB_TRACKER.md`](./JOB_TRACKER.md)

## Setup (local)

Focus for now: **`run easy`** + extension on localhost — see [`docs/ENV.md`](./ENV.md).

```bash
run easy    # local dev — see docs/ENV.md
```

Deploy production: `run easy prod` — **deferred**; use when ready.

**Production cutover checklist:** [`docs/PROD_CUTOVER.md`](./PROD_CUTOVER.md) — DB migrations (incl. P3009 recovery), Vercel env, **Google OAuth prod setup**, storage, smoke tests. Summary also in [`docs/ACTION_ITEMS.md`](./ACTION_ITEMS.md).

## Deploy (Vercel) — deferred

Local Google OAuth was recreated for localhost (Jun 2026). **Prod still needs:** prod redirect URIs, Vercel `GOOGLE_*` + `NEXTAUTH_*`, P3009 migration fix, then smoke test. Details: [`PROD_CUTOVER.md`](./PROD_CUTOVER.md).

## Dev

```bash
run easy            # local dev (.env.local)
run easy prod       # deploy to Vercel (prod env on Vercel only)
npm run db:check    # test local DB connection
npm run build       # prisma generate + next build
```
