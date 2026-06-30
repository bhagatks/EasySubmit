# Screen & Route Inventory

> **System of record** for user-visible screens, routes, and modal overlays.  
> Update this file when adding or renaming a route, sidebar item, or major overlay.

**Related:** [`FLOW.md`](./FLOW.md) (onboarding + auth flow detail) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) (runtime surfaces) · [`IDENTITY_AND_BOOT_RULES.md`](./IDENTITY_AND_BOOT_RULES.md) (routing gates) · [`JOB_TRACKER.md`](./JOB_TRACKER.md) (Review Screen detail) · [`north-star.md`](./north-star.md) (enhance entry surfaces F1–F7) · [`APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md) (extension setup screens) · [`enhance-pipeline-design.md`](./enhance-pipeline-design.md) (shared diag threshold config)

---

## Observability — `[ScreenDiag]`

Every screen visit emits **three console lines** in dev (filtered by the same threshold as `[EnhanceDiag]`):

| Level | Event | When |
|-------|--------|------|
| **high** | `screen.enter` | Route/overlay boundary — screen opened |
| **low** | `screen.ready` | Screen identified with key params (`screenId`, route, zone) |
| **light** | `screen.context` | Verbose flags (query param **keys** only, no values) |

**Config:** `app_config.enhanceDiagnostics` (`enabled`, `logThreshold`: `light` \| `low` \| `high`). Env: `EASYSUBMIT_ENHANCE_DIAGNOSTICS_ENABLED`, `EASYSUBMIT_ENHANCE_DIAGNOSTICS_THRESHOLD`.

**Implementation:** `src/shared/observability/screen-diagnostics.ts` · route map `resolve-screen-from-path.ts` · web tracker `components/providers/screen-diagnostics-tracker.tsx` (mounted from `AnalyticsProvider`).

**PostHog:** Every screen visit also emits `screen_viewed` with `screen_id`, `screen_label`, `zone`, `route`, and safe params/flags. Unified helpers: `trackScreenView()` (routes) and `trackScreenOverlay()` (modals, extension) in `src/shared/analytics/screen-events.ts`. Generic `$pageview` still fires on route changes for PostHog funnels.

**Semantic events** (in addition to `screen_viewed`): login, onboarding phases, review open/tab, enhance, BYOK, extension apply/autofill — see `src/shared/analytics/events.ts`.

**Overlay screens** (no dedicated route) call `trackScreenOverlay()` from their mount handler: Review Screen, onboarding phases, synthesis transition, setup modals, Ignition Gate, extension popup/card, application profile setup.

---

## Public (no auth)

| Screen name | Route | Notes |
|-------------|-------|-------|
| **Marketing landing** | `/` | Hero, features, embedded pricing section; signed-in nav → Dashboard |
| **Pricing** | `/pricing` | Standalone pricing page |
| **Select plan** | `/select-plan` | Post-signup plan picker (“Choose your plan”) |
| **Extension landing** | `/extension` | Chrome extension marketing |
| **Login** | `/login` | Google + LinkedIn OAuth |
| **Sign up (legacy)** | `/auth/signup` | Supabase email/OAuth path |
| **Terms of Service** | `/terms` | Legal |
| **Privacy Policy** | `/privacy` | Legal |
| **Help Center** | `/help` | Public FAQs and guides; category + article routes under `/help/[category]/[slug]` |

---

## Onboarding (auth required)

| Screen name | Route | Notes |
|-------------|-------|-------|
| **Unified Workbench** | `/onboarding` | Default post-login entry — 3 phases (see below) |
| **Onboarding step 1** | `/onboarding/step-1` | Redirect → `/onboarding` |
| **Onboarding workbench** | `/onboarding/workbench` | Redirect → `/onboarding` |
| **Legacy refinery** | `/onboarding/refinery` | Redirect → `/onboarding` |
| **Resume mapping (legacy)** | `/onboarding/step-4` | Legacy AI scanner route |

### Workbench phases (`/onboarding`)

| Phase | UI label | Panel component |
|-------|----------|-----------------|
| 1 · Identity | Identity | `CoordinatesPanel` |
| 2 · Import | Import | `FuelPanel` |
| 3 · Studio | Studio | `RefineryPanel` |

### Post-onboarding overlays (not routes)

| Screen name | Trigger | Notes |
|-------------|---------|-------|
| **Synthesis Transition** | After Studio finalize | Full-screen mint scan (~3s) |
| **BYOK setup modal** | `/dashboard?setup=1` | `DashboardByokPromptModal` + `IgnitionGate` |
| **Extension install modal** | After BYOK modal | `ExtensionInstallPromptModal` |

---

## Dashboard (auth + onboarding complete)

Sidebar labels match `components/dashboard/DashboardShell.tsx`.

| Screen name | Route | Sidebar | Notes |
|-------------|-------|---------|-------|
| **Overview** | `/dashboard` | Overview | Pipeline strip, ranked action queue, weekly progress, extension status |
| **Resume profiles** | `/dashboard/resume-profiles` | Resume profiles | List; `+` → new profile |
| **New resume profile** | `/dashboard/resume-profiles/new` | — | Copy default or blank |
| **Resume Studio** | `/dashboard/resume-profiles/[id]/edit` | — | Profile editor (Editor \| Layout tabs) |
| **Job Tracker** | `/dashboard/job-tracker` | Job Tracker | Pipeline rows → Review Screen |
| **Job Review Studio** | `/dashboard/job-tracker/[id]/resume` | — | Studio edit from Review Screen (`?from=review`) |
| **ATS Scores** | `/dashboard/ats-scores` | ATS Scores | Cross-job readiness workspace |
| **ATS Guidelines** | `/dashboard/ats-guidelines` | ATS Guidelines | In-app ATS rules reference |
| **Extension** | `/dashboard/extension` | Extension (when not connected) | Install + connect bridge; sidebar item hidden once extension is connected on this browser |
| **Video Tutorials** | `/dashboard/tutorials` | Video Tutorials | Six walkthroughs; `?welcome=1` post-setup |
| **Settings** | `/dashboard/settings` | Settings | Account, AI toggle, BYOK vault, extension prefs |
| **About** | `/dashboard/about` | About | Product overview, contact, legal links |

### Redirects & internal

| Route | Target |
|-------|--------|
| `/dashboard/applications` | `/dashboard/job-tracker` |
| `/dashboard/keys` | `/dashboard/settings` (`?addKey=1` opens add-key modal) |
| `/dashboard/resumes` | Placeholder / legacy |
| `/dashboard/testing-resume` | Dev harness only |

---

## Review Screen (modal overlay)

Opened from Job Tracker (not a standalone route). Deep-link: `?job={id}&panel={tab}` on tracker.

| Tab name | Panel id | Component |
|----------|----------|-----------|
| **Job** | `job` | Job description + metadata |
| **Resume** | `resume` | `ReviewResumePanel` — preview, Enhance, export |
| **Cover letter** | `cover` | Inline edit + Enhance + export |
| **ATS Analysis** | `ats` | Readiness, keyword gap, bullet quality, robot parse |

Default tab: **Resume** when status is `RESUME_READY` or `READY_TO_APPLY`; otherwise **Job**.

---

## Extension (Chrome MV3)

| Surface | Location | Notes |
|---------|----------|-------|
| **In-page job card** | Content script on job sites | Summary: Job Info / Resume / Cover Letter |
| **Extension popup** | Browser toolbar | Status, settings, connect |
| **Auth bridge** | `/extension/bridge` | Session token handoff to extension |
| **Application profile Screen 1** | Extension card (first Apply) | Work auth + preferences — see [`APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md) |
| **Application profile Screen 2** | Extension card | Optional EEO (skippable) |
| **Ignition Gate** | Modal (dashboard/onboarding) | BYOK provider + model selection |

---

## Enhance entry surfaces (cross-reference)

For which screen triggers resume enhance, see [`north-star.md` §3.1](./north-star.md#31-surface-map) (F1–F7).

| ID | Screen |
|----|--------|
| F1 | Onboarding Studio (auto after upload) |
| F2 | Extension pipeline tailor |
| F3 | Review Screen → Resume tab |
| F4 | Extension card manual enhance |
| F5 | Job Resume Studio |
| F6 | Base Resume Studio |
| F7 | Dev testing page |

---

## Change log

| Date | Change |
|------|--------|
| 2026-06-28 | Action-level PostHog events — pricing, tutorials, ATS scores/guidelines, exports, studio tabs, settings sections |
| 2026-06-28 | PostHog `screen_viewed` — unified `trackScreenView` / `trackScreenOverlay` for all screens (routes + overlays) |
| 2026-06-28 | `[ScreenDiag]` logging — high/low/light per screen visit; wired to routes + overlays |
| 2026-06-28 | Created screen inventory; linked from FLOW, ARCHITECTURE, PROJECT_STATE, IDENTITY_AND_BOOT_RULES, JOB_TRACKER, north-star |
