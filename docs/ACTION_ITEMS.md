# Action Items

## QA & E2E testing (priority)

**Enhance playbook:** [`docs/enhance-qa-playbook.md`](./enhance-qa-playbook.md) · **Pipeline matrix:** [`docs/north-star.md`](./north-star.md) §14 · **Dev harness:** `/dashboard/testing-resume` (dev only)

Code fixes from the first AI on/off review (Phases 1–6, D-01–D-22) are **Done**. The **testing program** below is **not** complete — track here until signed off.

### Enhance QA — finish AI on/off testing program

| Item | Status | Notes |
|------|--------|-------|
| Re-run **Case 001** A/B/C (base → AI off → AI on) on Review | **Todo** | Bhagath eng × iRhythm procurement — manual sign-off per playbook §2.3 |
| **Case 002+** — same-domain + other JD categories | **Todo** | Playbook §6 — SWE, PM, procurement-native, etc. |
| **North-star §14 test matrix** — full pass / sign-off | **Todo** | AI off/on, quota, BYOK, pool down, extension card — Wave C in `north-star.md` |
| **3-artifact regression** — pipeline-level, not unit slices | **Todo** | Extend `enhance-qa-case-001.test.ts` or add `run-resume-enhance-pipeline.test.ts`; D-22 partial today |
| **Dev harness A/B/C** — AI off vs on in one session | **Todo** | `/dashboard/testing-resume` — toggle + side-by-side diff; today uses user setting only |
| Extension pipeline tailor — AI off/on on `variant: pipeline` | **Todo** | Same A/B/C protocol as Review |
| Playbook product items **P-01**, **P-02**, **P-03** | **Todo** / **Partial** | Cross-domain role suggestions; feedback tiers; export without JD injection when AI off |

### Resume E2E (test separately from jobs)

End-to-end **resume profile** flows — no JD / job tracker required.

| Flow | Status | Notes |
|------|--------|-------|
| Onboarding — Identity → Import (PDF/DOCX) → parse → Studio → validate → Finalize | **Todo** | Post-parse `validateResume` banner + section highlights; smoke in prod checklist below |
| Dashboard — new profile via upload (`FuelPanel`) → Studio → save | **Todo** | `/dashboard/resume-profiles/new` |
| Dashboard — edit profile → Studio save gate | **Todo** | `saveResumeProfileStudio()` + validation errors |
| Parse quality — golden template + Bhagath sample | **Todo** | `npm run validate:ats-template`; browser `parseResumeFile` parity manual |
| Export — PDF / Word / HTML preview from saved profile | **Todo** | `lib/job-tracker/export/*` — ATS section order per `docs/resume/RULES.md` |
| Onboarding enhance (deterministic only, no JD) | **Todo** | Auto `enhanceResumeOnboarding()` after upload — baseline only |

### Job E2E (test separately from resume profiles)

End-to-end **job tracker + tailor** flows — assumes a base resume profile exists.

| Flow | Status | Notes |
|------|--------|-------|
| Dashboard — manual add job (paste JD) → capture → async tailor | **Todo** | `JobTrackerPageContent` — no extension |
| Extension — detect → capture → pipeline tailor → `RESUME_READY` | **Todo** | `POST /api/extension/jobs/pipeline` |
| Review Screen — Job \| Resume \| Cover \| Apply tabs | **Todo** | Open from tracker row; toolbar exports + Enhance |
| Tailor — **AI off** enhance → persist `job_resume_tailors` | **Todo** | Part of Enhance QA A/B/C on a real job entry |
| Tailor — **AI on** enhance → same job entry | **Todo** | Compare to base + AI off artifacts |
| Cover letter — template + optional AI enhance | **Todo** | Review Cover tab |
| Status transitions — `CAPTURED` → tailor → `RESUME_READY` → Apply CTA | **Todo** | Retry optimize on stuck `CAPTURED` — row action exists; verify E2E |
| Keyword gap overlay on extension card (`READY_TO_APPLY`) | **Todo** | `GET_KEYWORD_GAP` — verify on live apply page |

---

## Deploy to Vercel + Chrome Web Store

**Guides:** [`DEPLOYMENT.md`](./DEPLOYMENT.md) · [`DEPLOYMENT_TROUBLESHOOTING.md`](./DEPLOYMENT_TROUBLESHOOTING.md) · [`PROD_CUTOVER.md`](./PROD_CUTOVER.md)

| Step | Status | Notes |
|------|--------|-------|
| Env injection refactor (`run easy`, no file swap) | **Done** | `docs/DEVELOPMENT_WORKFLOW.md` |
| **Env domains** (PostHog vs DATABASE_URL) | **Done** | `lib/env/env-resolution.mjs`, `docs/rules/env-domains.md`; Jul 2026 |
| Web CI workflow (tests only) | **Done** | `.github/workflows/ci.yml` |
| Extension CI workflow (build + signed CRX artifact) | **Done** | `.github/workflows/deploy.yml` — add `CHROME_CRX_PRIVATE_KEY` secret; CWS publish manual until listing approved |
| Vercel Production env vars | **Done** | Dashboard only — **do not re-sync on each deploy** |
| `prisma.config.ts` / `DIRECT_URL` build fix | **Done** | No `directUrl` in config; migrate via `prisma-migrate-deploy.mjs` |
| Prod web deploy (`www.easysubmit.ai`) | **Done** | Jun 2026 |
| Connect GitHub repo to Vercel | **Done** | Auto-deploy on `main` — `bhagatks/EasySubmit` |
| **Google OAuth — prod redirect URIs** | **Done** | Prod smoke test Jul 2026 |
| LinkedIn OAuth redirect URI (prod) | **Done** | Prod smoke test Jul 2026 |
| Run Prisma migrate on production DB | **Done** | Via Vercel build (`prisma-migrate-deploy.mjs`) |
| **RLS on public tables** (`20260702120000_enable_rls_public_tables`) | **Pending** | Ships on next Vercel deploy; closes Supabase linter finding; app uses BYPASSRLS via pooler |
| Supabase Storage bucket `avatars` | **Done** | Bucket exists on prod; `npm run prod:ensure-avatars-bucket` |
| Chrome Web Store publish | **Blocked** | Listing under review — manual workflow + `publish_to_cws` after approval |
| **PostHog analytics — Vercel prod** | **Done** | Key synced; build gate + `npm run prod:verify-posthog` |
| **PostHog UI settings** (both projects) | **Closeout** | `npm run analytics:closeout` — PostHog keys only; see [`docs/rules/env-domains.md`](./rules/env-domains.md) |
| **PostHog dashboards** | **Closeout** | Included in `analytics:closeout` |
| **`prod:health` from laptop** | **Done** | `npx vercel link` + `npm run prod:health` (uses `vercel env run -e production`) |

## Post-deploy smoke test

See also [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §7.

- [x] `/login` — Google OAuth completes → `/onboarding`
- [x] `/login` — LinkedIn OAuth completes
- [x] `/onboarding` — wizard steps advance
- [x] Resume upload → `/onboarding/step-4` animation → `/dashboard`
- [x] Unauthenticated `/dashboard` → `/login`
- [x] PostHog — prod `$pageview` on `/login` (project `488042`, `environment = prod`)

## Follow-up (not blocking deploy)

### O*NET Web Services — Vocabulary step (pending approval)

Submitted **2026-07-03** — waiting for O*NET staff to approve EasySubmit organization. Approval email → **My Account** → project → **Add a new API key**.

| Item | Status | Notes |
|------|--------|-------|
| O*NET developer signup | **Done** | Submitted; awaiting staff review email |
| Add `ONET_API_KEY` to `.env.local` (+ Vercel prod when ready) | **Todo** | After approval — key from My Account, not username/password |
| Migrate `lib/job-tracker/ats/onet-service.ts` to **v2 API** | **Todo** | Today uses v1.9 Basic auth (`guest`/`guest` → 401). Follow [web-services-v2-samples](https://github.com/onetcenter/web-services-v2-samples) (`X-API-Key`, `api-v2.onetcenter.org`, `online/search` + summary skills/tools) |
| Verify Vocabulary step on a live Apply run | **Todo** | Pipeline debug `pre_onet` should show skills/tools, not `source: fallback` |

### Pricing & plan marketing copy (v1.0) — **complete**

Single source: `lib/pricing/plan-display.ts` + `components/pricing/PricingPlansSection.tsx`.

| Item | Status | Notes |
|------|--------|-------|
| Shared plan copy + cards | **Done** | `PRICING_PAGE_COPY`, FAQ (3), 5 visible + expandable lists (18 free / 19 paid), savings under M/Y price, paid “Coming Soon” when `!subscriptions.enabled` |
| `/pricing` | **Done** | `PricingPlansSection showFaq` |
| `/select-plan` | **Done** | Same plans/copy + footers as pricing |
| Landing `/` | **Done** | Hero + metadata + features from `FREE_PLAN_VISIBLE_FEATURES`; full 4-card grid via `PricingPlansSection` |
| `/extension` | **Done** | Subhead/footers from `PRICING_PAGE_COPY`; feature tiles use free-plan strings; link to `/pricing` |
| `app_config` display features JSON | **Done** | Feature strings in `plan-display.ts` |
| `/dashboard/billing` + live subscribe CTAs | **Done** | |
| Upgrade nudge UI (`resolve-subscription`) | **Done** | |
| FAQ “What is EasySubmit AI?” | **Done** | |

### North-star resume enhance — implementation tracker

**Spec:** [`docs/north-star.md`](./north-star.md) (§2.1 frameworks, §23 JDSkillsFramework, §24 work inventory)

#### Wave A — JDSkillsFramework

| Step | Status | Notes |
|------|--------|-------|
| All Wave A items | **Done** | `jd-skills-service.ts`, deterministic + ESCO providers, tests |

#### Wave B — 3-phase pipeline

| Step | Status | Notes |
|------|--------|-------|
| All Wave B items | **Done** | `run-resume-enhance-pipeline.ts`, brief/baseline/weave, soft gates, UI |

**Local DB migrations** — run `npx prisma migrate dev` (or `run easy`) to apply:
- `20260627120000_north_star_jd_skills_enhance_meta`
- `20260627140000_extension_install_prompt_config`

#### Open product decisions

- [x] Quota: baseline-only does **not** count toward daily limit — only when `aiSucceeded` or `jdAiCallCount > 0`
- [x] ESCO-only for v1 — ship with deterministic + ESCO; ESCOX deferred until volume warrants self-hosting

### Analytics — Phase C (legal / compliance) — **complete**

| Item | Status | Notes |
|------|--------|-------|
| **Privacy policy — PostHog / session replay** | **Done** | Added "Product analytics & session replay" subsection to `legal-documents-defaults.ts` disclosing PostHog analytics, session replay, error tracking, and masking of resume content. Date bumped to June 27, 2026. |
| **EU cookie consent banner** | **N/A** | US-only beta — GDPR/ePrivacy not applicable until EU users are targeted. |

- ~~Add `@testing-library/react` harness for onboarding UI~~ — **Done** (`config/vitest.component.config.ts`, 14 component tests across `OnboardingNextButton`, `OnboardingFlowShell`, `PhaseProgressBar`)

### Enhance QA — code fixes (complete)

**Active testing backlog:** see **[QA & E2E testing (priority)](#qa--e2e-testing-priority)** above.

**Playbook:** [`docs/enhance-qa-playbook.md`](./enhance-qa-playbook.md) — protocol: **base → AI off → AI on → review all three.**

| Phase | Defect IDs | Status |
|-------|------------|--------|
| 1 — Deterministic safety (junk skills, filter bypass) | D-01, D-02, D-03, D-18, D-19 | **Done** |
| 2 — Summary integrity (`[review]s`, fabricated claims, identity swap) | D-04, D-05, D-06, D-08, D-20 | **Done** |
| 3 — Coherence & UX (cross-domain warn, ATS honesty) | D-07, D-09, D-10, D-11, P-02 | **Done** (P-02 product tiering **partial**) |
| 4 — Domain & bullets | D-13, D-14, D-17, D-12 | **Done** |
| 5 — Merge polish (dates, contact) | D-15, D-16 | **Done** |
| 6 — Regression lock (fixture + debug doc) | D-22, D-21 | **Partial** — unit slices + Case 001 manual pass; full 3-artifact pipeline automation **Todo** (top section) |

## JD AI observability (completed 2026-06-27)

| Item | Status |
|------|--------|
| `callEnhanceObjectModel` → `api_call_logs` (`ai.enhance.generate_object`) | **Done** |
| JD extract quota pre-check + count toward `aiCallsToday` | **Done** |
| `aiEngine.system.jdExtractionModelId` + BYOK model behavior documented | **Done** |

## JD Brain (completed 2026-06-22)

Full spec: **[`docs/JD_BRAIN_ARCHITECTURE.md`](./JD_BRAIN_ARCHITECTURE.md)**

| Item | Status |
|---|---|
| DB migration (jdIntelligence, jdDescriptionHash, jdIntelUpdatedAt on jobTrackerEntry) | Done |
| `lib/job-tracker/jd/` — 5-layer pipeline (cleaner, segmenter, extractor, AI extractor, directive) | Done |
| `analyzeKeywordGapFromIntelligence` — tiered weighted scoring (tier1×3, tier2×2, tier3×1) | Done |
| `computeResumeReadiness` — accepts optional JDIntelligence for tiered keyword scoring | Done |
| `buildDirectiveBlock` in brain.ts — directive-based AI prompt replaces raw gap block | Done |
| `enhanceDirective` wired through run-enhance.ts → buildEnhanceUserPrompt | Done |
| JD Brain integrated into `enhance-resume-for-user.ts` (cache load/persist, directive build) | Done |
| `parseJsonLdJobFields` in scrape-helpers.ts — structured field extraction | Done |
| `jsonLdFields` added to `ScrapedJobMetadata` | Done |
| 38 unit tests — all passing | Done |

**Completed (2026-06-22):**
- Wire `jobEntryId` into `review-documents.ts` and pipeline API calls ✓
- Wire `jsonLdFields` from site adapters into scrape results ✓
- Phase 1 dedicated adapters: Lever, Ashby, iCIMS, SmartRecruiters, Taleo, Jobvite ✓
- Phase 2 adapters: all 10 platforms added ✓
- `ExtensionPlatform` type includes all Phase 2 platforms ✓
- Shadow DOM traversal (`src/shared/extension/shadow-dom.ts`) ✓
- Network API intercept layer (`src/shared/extension/api-intercept.ts`) ✓
- Answer vault (`src/shared/extension/answer-vault.ts`) ✓

---

## ATS Platform Support Roadmap

### Core (always supported)
| Platform | Scraper | Autofill | ATS Rules |
|---|---|---|---|
| LinkedIn | ✓ Done | Pending | Pending |
| Indeed | ✓ Done | Pending | Pending |
| Greenhouse | ✓ Done | Pending | ✓ partial |
| Workday | ✓ Done | Partial stub | ✓ partial |
| Generic fallback | ✓ Done | — | — |

### Phase 1
| Platform | Scraper | Autofill | ATS Rules |
|---|---|---|---|
| Lever | ✓ (ExtensionPlatform) | Pending | Pending |
| Ashby | ✓ (ExtensionPlatform) | Pending | Pending |
| iCIMS | ✓ (generic selectors) | Pending | ✓ partial |
| SmartRecruiters | ✓ (ExtensionPlatform) | Pending | Pending |
| Taleo | ✓ (generic selectors) | Pending | ✓ partial |
| Jobvite | ✓ (ExtensionPlatform) | Pending | ✓ partial |

### Phase 2 (adapters done, autofill pending)
| Platform | Scraper | Autofill | ATS Rules |
|---|---|---|---|
| SuccessFactors | ✓ JSON-LD + DOM | Pending | Pending |
| Workable | ✓ JSON-LD + DOM | Pending | Pending |
| BambooHR | ✓ DOM | Pending | Pending |
| ADP | ✓ DOM | Pending | Pending |
| Rippling | ✓ DOM | Pending | Pending |
| JazzHR | ✓ DOM | Pending | Pending |
| Paylocity | ✓ DOM | Pending | Pending |
| Paycom | ✓ DOM | Pending | Pending |
| ClearCompany | ✓ DOM | Pending | Pending |
| Teamtailor | ✓ JSON-LD + DOM | Pending | Pending |

### Novel Detection Features (done 2026-06-22)
| Feature | File | Status |
|---|---|---|
| Shadow DOM traversal (Workday/iCIMS) | `src/shared/extension/shadow-dom.ts` | ✓ Done |
| Network API intercept (Greenhouse/Lever/Ashby/SmartRecruiters) | `src/shared/extension/api-intercept.ts` | ✓ Done |
| Per-question answer vault | `src/shared/extension/answer-vault.ts` | ✓ Done |

**Still pending:**
- Wire `injectApiInterceptScript()` + `onApiIntercept()` into content script boot (`extension/src/content/index.ts`)
- Wire answer vault into Workday autofill field-fill loop
- ~~Real-time keyword gap overlay in card during form fill~~ — **Done** (`/api/extension/jobs/[id]/keyword-gap`, `GET_KEYWORD_GAP` message, fetched on `READY_TO_APPLY` transition, rendered as red chip strip in summary card)

---

## Job Tracker & Chrome extension

Full specs: **[`docs/JOB_TRACKER.md`](./JOB_TRACKER.md)** · Workday E2E (cancelled): **[`docs/WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md)** · Popup redesign: **[`docs/EXTENSION_POPUP_REDESIGN.md`](./EXTENSION_POPUP_REDESIGN.md)** · Scope: **[`docs/decisions.md`](./decisions.md)**

| Item | Status |
|------|--------|
| `job_tracker_entries` schema + migrations | Done |
| Dashboard pipeline tracker (pizza bar rows) | Done |
| Review Screen (rename from job review overlay) | Done |
| Archive + auto-archive + delete | Done |
| Dashboard Kanban + list | Removed — replaced by pipeline rows |
| Extension reconnect hint on tracker page | Removed — use extension popup / bridge only |
| Extension API (`/api/extension/jobs`) | Done |
| MV3 extension + in-page card | Done |
| **Auto-apply user switch** (`users.autoApplyUserSwitch`) | Legacy — **do not extend**; remove from Settings/popup (`decisions.md`) |
| **Pipeline API** (`POST /api/extension/jobs/pipeline`) | Legacy — not v1 user-facing one-click |
| **Autofill complete API** (`POST /api/extension/jobs/[id]/autofill-complete`) | Done — metadata only; real Workday fill **cancelled** |
| **Job Tracker Realtime sync — Dev** | Done — publication + RLS applied; `SUPABASE_JWT_SECRET` set in `.env.local`; restart dev server to pick up |
| **Job Tracker Realtime sync — Prod** | Done — `SUPABASE_JWT_SECRET` + `NEXT_PUBLIC_SUPABASE_URL` added to Vercel Production, redeployed |
| Workday scraper hardening (W1–W10) | Partial — apply URL canonicalize + company fallback |
| Enhance AI in pipeline (Phase B) | Done — B1–B7 (B6 partial: card busy label + polling) |
| Workday autofill port (Phase C) | **Cancelled** — one-click apply out of scope |
| **Part 1 — Manual detection & force capture** | Todo — force show → manual capture; inject script if missing; see `EXTENSION_POPUP_REDESIGN.md` |
| **Part 2 — Extension popup redesign** | Todo — launcher UI, mini stats, settings; no one-click toggle |
| Extension popup one-click toggle | **Remove in Part 2** |
| Extension reconnect UX in popup/settings | Done — popup shows "Connect account" / "Reconnect account" with `OPEN_LOGIN` flow; dashboard banner removal was intentional |

### Dashboard UX — follow-ups (Jun 2026)

| Item | Status | Notes |
|------|--------|-------|
| Settings **Expand all** in page header (not top chrome) | **Done** | `AccountSettings` aside + `DashboardExpandAllButton` `placement="page"` |
| Job Tracker page header actions (Add job, Archive) | **Done** | `JobTrackerPageContent` + `JobTrackerHeaderActions` |
| **Extension** sidebar item | **Done** | Hidden when extension connected; `/dashboard/extension` route unchanged |
| **Job Tracker shell-first cards** | **Done** | `tracker-row-chrome.ts` — fixed action slots; disabled until ready |
| **Retry optimize** on stuck `CAPTURED` | **Done** | Stall detection + `tailorJobTrackerEntry` from tracker row |
| **Tailor mid-pipeline failure handling** | **Done** | `recordPipelineTailorError` on crash in tailor route, action, `tailorJobPipeline` |

