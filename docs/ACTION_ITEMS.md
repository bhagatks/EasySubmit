# Action Items

> **Production deploy:** intentionally **deferred** — continue local dev + extension work; revisit this section when ready to ship.

## Deploy to Vercel (deferred)

**Master checklist:** [`docs/PROD_CUTOVER.md`](./PROD_CUTOVER.md) — DB migrations, Vercel env, OAuth prod setup, storage, smoke tests.

| Step | Status | Notes |
|------|--------|-------|
| Fix production build (`npm run build`) | Done | Extension page + lucide `Github` → `Code2` |
| Connect GitHub repo to Vercel | Deferred | `bhagatks/EasySubmit` |
| Set production env vars in Vercel | Deferred | See `.env.vercel.example` (Supabase `yofgnflcqajqsepbfdkc`) |
| Set QA/preview env vars (optional) | Deferred | Vercel Preview: use dev Supabase vars from `.env.example` |
| Set `NEXTAUTH_URL` to prod domain | Deferred | Must match deployed URL exactly |
| **Google OAuth — prod client + redirect URIs** | **Todo** | Local client recreated Jun 2026 for localhost only; prod needs `https://<domain>/api/auth/callback/google` + Vercel `GOOGLE_*` — see [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §4, [`oauth-setup.md`](./oauth-setup.md) |
| LinkedIn OAuth redirect URI (prod) | Verify | Re-check prod callback against live domain |
| Run Prisma migrate on production DB | Blocked — P3009 | See `docs/MIGRATION_RECOVERY.md` — resolve before prod cutover |
| Supabase Storage bucket `resumes` | **Cancelled** — PDFs on-demand only, never stored (see `APPLICATION_PROFILE.md`) | — |
| Supabase Storage bucket `avatars` (public read) + `SUPABASE_SERVICE_ROLE_KEY` | Needed for prod avatar upload | Dev falls back to `public/avatars/`; see `lib/profile/avatar-storage.ts` |
| **PostHog analytics — local dev** | **In progress** | A1 done — dev key in `.env.local` (project `488025`); complete A2–A7 in [`analytics-option-a.md`](./analytics-option-a.md) |
| **PostHog analytics — Vercel prod** | **Todo** | Prod key (project `488042`) + §8 in [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) |
| **PostHog UI settings** (both projects) | **Todo** | Web autocapture on (UI + env); replay on; errors on; blocklist; masking |
| **PostHog dashboards** (optional) | **Todo** | `POSTHOG_PERSONAL_API_KEY=phx_… npm run analytics:setup` |

## Post-deploy smoke test (when prod ships)

See also [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §7.

- [ ] `/login` — Google OAuth completes → `/onboarding`
- [ ] `/login` — LinkedIn OAuth completes
- [ ] `/onboarding` — wizard steps advance
- [ ] Resume upload → `/onboarding/step-4` animation → `/dashboard`
- [ ] Unauthenticated `/dashboard` → `/login`
- [ ] PostHog — prod `login_completed` visible (project `488042`, filter `environment = prod`)

## Follow-up (not blocking deploy)

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

**Local DB:** migration `20260627120000_north_star_jd_skills_enhance_meta` — run `npx prisma migrate dev` (or `run easy`) to apply.

#### Open product decisions

- [ ] Quota: does baseline-only count toward daily limit? (§18.2 — provisional: no, only when `aiSucceeded`)
- [ ] ESCOX self-host vs ESCO-only for v1 (§23.2 — provisional: deterministic + ESCO for v1)

### Analytics — Phase C (legal / compliance)

| Item | Status | Notes |
|------|--------|-------|
| **Privacy policy — PostHog / session replay** | **Todo** | Update `legal-documents-defaults` (or `app_config.legalDocuments`) to disclose product analytics, session replay, and error tracking. See [`analytics-option-a.md`](./analytics-option-a.md) Phase C. |
| **EU cookie consent banner** | **Todo** | Evaluate if required for target regions; wire opt-in before PostHog init if yes. Not needed for US-only beta unless legal says otherwise. |

- Add `@testing-library/react` harness for onboarding UI (see sidepanel rule pattern)

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
- Real-time keyword gap overlay in card during form fill (Phase C UI)

---

## Job Tracker & Chrome extension

Full specs: **[`docs/JOB_TRACKER.md`](./JOB_TRACKER.md)** · Workday E2E: **[`docs/WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md)**

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
| **Auto-apply user switch** (`users.autoApplyUserSwitch`) | Done |
| **Pipeline API** (`POST /api/extension/jobs/pipeline`) | Done — capture → tailor → server `READY_TO_APPLY`; Workday autofill assist optional |
| **Autofill complete API** (`POST /api/extension/jobs/[id]/autofill-complete`) | Done — metadata only when already `READY_TO_APPLY`; real Workday fill pending |
| **Job Tracker Realtime sync** | Done (QA) — publication + RLS applied; `SUPABASE_JWT_SECRET` in `.env.local`; restart dev server to pick up |
| Workday scraper hardening (W1–W10) | Partial — apply URL canonicalize + company fallback |
| Enhance AI in pipeline (Phase B) | Done — B1–B7 (B6 partial: card busy label + polling) |
| Workday autofill port (Phase C) | Partial — stub runner + `READY_TO_APPLY`; field map pending |
| Extension popup one-click toggle | Done |
| Extension reconnect UX in popup/settings | Pending — banner removed from job tracker |
