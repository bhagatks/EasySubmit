# Action Items

> **Production deploy:** intentionally **deferred** — continue local dev + extension work; revisit this section when ready to ship.

## Deploy to Vercel (deferred)

| Step | Status | Notes |
|------|--------|-------|
| Fix production build (`npm run build`) | Done | Extension page + lucide `Github` → `Code2` |
| Connect GitHub repo to Vercel | Deferred | `bhagatks/EasySubmit` |
| Set production env vars in Vercel | Deferred | See `.env.vercel.example` (Supabase `yofgnflcqajqsepbfdkc`) |
| Set QA/preview env vars (optional) | Deferred | Vercel Preview: use dev Supabase vars from `.env.example` |
| Set `NEXTAUTH_URL` to prod domain | Deferred | Must match deployed URL exactly |
| Google OAuth redirect URI | Done | Prod callbacks registered |
| LinkedIn OAuth redirect URI | Done | Prod callbacks registered |
| Run Prisma migrate on production DB | Blocked — P3009 | See `docs/MIGRATION_RECOVERY.md` — resolve before prod cutover |
| Supabase Storage bucket `resumes` | **Cancelled** — PDFs on-demand only, never stored (see `APPLICATION_PROFILE.md`) | — |
| Supabase Storage bucket `avatars` (public read) + `SUPABASE_SERVICE_ROLE_KEY` | Needed for prod avatar upload | Dev falls back to `public/avatars/`; see `lib/profile/avatar-storage.ts` |

## Post-deploy smoke test (when prod ships)

- [ ] `/login` — Google OAuth completes → `/onboarding/step-1`
- [ ] `/onboarding` — wizard steps advance
- [ ] Resume upload → `/onboarding/step-4` animation → `/dashboard`
- [ ] Unauthenticated `/dashboard` → `/login`

## Follow-up (not blocking deploy)

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
