# Enhance Pipeline — Design Reference

Captured from design session 2026-06-26. Updated 2026-06-26 with complete step audit. Read this before touching any AI enhance, features framework, or onboarding/job-apply flow code.

---

## What "Enhance" means

"Enhance with AI" (or just "Enhance") is a single feature with one name regardless of surface. The surface changes what context is available (JD or not) and which engine runs (AI or deterministic), but the user-facing action is always the same thing.

---

## Two flows: Onboarding vs Job Apply / Extension

### Onboarding flow
- Input: Raw Form + Target Role — **no JD attached**
- Engine: **Deterministic only** — AI call is intentionally skipped
- Pre-processing: O*NET vocabulary + bullet quality + Summary/Skills rules only. JD steps (segmentation, fast-rake, keyword gap, ATS parse, JD brain, directive) are all skipped — no JD exists
- Output saved to: **base resume profile**
- Intentionally lite — generic role-scoped output, no job-specific intelligence

### Job apply / Extension flow
- Input: Raw Form + JD Text — full job description attached
- Engine: **AI first, deterministic fallback** — all pre-processing steps run, AI call fires with richer context
- Fallback: If AI call fails → deterministic engine runs with the same pre-processed intelligence
- Output saved to: **`job_resume_tailor`** — never touches base profile
- Feature flag: `enhanceWithAiResumeProfile`
- Dashboard and Extension share the same core steps — only resume source and post-persist side effects differ

### Key difference
Onboarding enhance is generic (role-only context). Job apply enhance is job-specific (JD keyword gaps, mustAddSkills, weak bullet rewrites). Same user action, completely different quality of output.

---

## Complete pipeline steps

Every step across all surfaces. Cross-referenced against diagrams, design doc, and code audit (2026-06-26).

### Step 0 — Preflight Gate *(dashboard UI only)*
`checkEnhanceWithAiPreflight()` in `app/actions/ai/enhance-resume.ts`. Runs before the Enhance dialog opens. Delegates entirely to `resolveFeature("enhance", ...)` — no inline flag or quota checks.

### Step 1 — Load Resume
Get the user's resume data into a `HubRefineryForm`.
- Onboarding → form comes directly from what user filled in
- Dashboard → `getMergedResumeForJob()` — loads base profile + any existing job-specific overrides, merges them
- Extension → `resolveSourceProfileForJob()` — always loads clean base profile (no prior edits exist yet)

### Step 2 — Validate Input
Fail fast before any expensive work.
- Onboarding → target role must exist
- Dashboard + Extension → JD must be ≥ 120 chars, job title must exist and sanitize via `sanitizeString()`

### Step 3 — O*NET Role Vocabulary
`fetchRoleVocabulary()` in `lib/job-tracker/ats/onet-service.ts`. Fetches standard skills and tools for the target role from O*NET. Surfaces implicit skills not in the resume and not in the JD. Role-scoped, not JD-scoped. **All surfaces run this.**

### Step 4 — Keyword Gap Analysis *(job apply + extension only)*
`analyzeKeywordGap()` in `lib/job-tracker/ats/keyword-gap.ts`. Compares JD keywords against the resume. Produces `missingKeywords`, `skillsToAdd`, `keywordsForContent`, `coveragePercent`. Skipped on onboarding — no JD.

### Step 5 — fast-rake + wink-nlp POS filter *(job apply + extension only)*
Multi-word phrase extraction from JD, keeps noun/proper-noun only. Implemented in `lib/job-tracker/jd/jd-nlp-extractor.ts` — rake-js + wink-nlp packages installed.

### Step 6 — Bullet Quality Analysis
`analyzeBulletQuality()` in `lib/job-tracker/ats/bullet-quality.ts`. Scans every bullet for weak verbs, weak phrases, missing metrics. Produces `weakBullets` with exact location (experience index + bullet index). **All surfaces run this.**

### Step 7 — ATS Parse Simulation *(job apply + extension only)*
`simulateAtsParse()` in `lib/job-tracker/ats/ats-parse-simulator.ts`. Simulates how an ATS parser reads the resume. Produces `structuralWarnings`. Skipped on onboarding.

### Step 8 — JD Brain / JD Intelligence *(job apply + extension only)*
`analyzeJobDescription()` in `lib/job-tracker/jd/jd-brain.ts`. Deep analysis of raw JD — extracted job title, seniority, must-have skills, tier1/tier2 keywords, target verbs, impact dimensions, culture signals, domain. Has a **cache** — checks `jdIntelligence` + `jdDescriptionHash` on the job entry; skips re-analysis on hash match, writes back on miss. Skipped on onboarding.

### Step 9 — Summary + Skills Rules Validate *(pre-processing Step 4 from diagrams)*
Enforces 4-sentence summary, 70–80 words, banned words, skills hard max. `post-process.ts` strips banned summary words and banned/prose skills, logs every rule trigger with `logEnhance`. Runs on all surfaces.

### Step 10 — Build Enhance Directive *(job apply + extension only)*
`buildResumeEnhanceDirective()` in `lib/job-tracker/jd/jd-directive.ts`. Converts `JDIntelligence` + current resume skills into `ResumeEnhanceDirective` — `mustAddSkills`, `mustWeaveKeywords`, `mustRemoveSkills`, `quantHints`, `effectiveTargetRole`, culture signals. This is the structured instruction set passed to the enhance engine. Skipped on onboarding.

### Step 11 — AI Gates G1–G6 *(job apply + extension only)*
Run inside `resolveFeature("enhance", ...)` via `lib/features/resolve-enhance.ts`. First failing gate wins. See AI switches table below. Onboarding never reaches this step. `enhance-resume-for-user.ts` delegates fully to `resolveEnhanceFeature()`.

### Step 12 — ATS Score BEFORE *(dashboard only)*
`computeResumeReadiness()` on the input form before enhance fires. Stored transiently — used to compute `atsDelta` after enhance completes. Not persisted.

### Step 13 — Enhance Engine
Takes form + intelligence context + directive → produces enhanced form.
- Onboarding → **Deterministic only**: mustAddSkills merge, weak bullet rewrite, summary left intact + flagged
- Job apply + Extension → **AI first** (see AI section), **deterministic fallback** if AI fails — same deterministic logic with pre-processed intelligence instead of raw tokens

### Step 14 — Post-process + Rules Enforcement
Runs on AI output. Basic cleanup exists. **NOT YET COMPLETE** — summary sentence/word count enforcement and skills enforce are missing. Deterministic path does not need this (output is already rule-compliant).

### Step 15 — Diff Changed Sections
`diffChangedSections()` in `src/lib/ai/engine/post-process.ts`. Compares output form against input form to produce `changedSections`. Used by UI to highlight changes and by persistence to record what was affected. **All surfaces.**

### Step 16 — Extract Overrides *(job apply + extension only)*
`extractJobResumeOverrides()` in `lib/profile/job-resume-overrides.ts`. Diffs enhanced form against the **base profile** (not the input form) to extract only job-specific changes. We never store a full resume copy per job — only the overrides. `getMergedResumeForJob()` in Step 1 re-merges on demand. Skipped on onboarding.

### Step 17 — Persist
Write results to DB.
- Onboarding → save enhanced form to base resume profile
- Dashboard + Extension → `upsertJobResumeTailor()` — save overrides + changedSections to `job_resume_tailor`

### Step 18 — Cover Letter Seed *(job apply + extension only)*
`buildCoverLetterSeedPatch()` in `lib/job-tracker/build-deterministic-cover-letter.ts`. Deterministically generates a starter cover letter from enhanced form + job details. Saves to `job_review_documents`. User gets a ready-to-edit cover letter without a separate action.

### Step 19 — ATS Score AFTER *(dashboard only)*
`computeResumeReadiness()` on the enhanced form. Returns `atsDelta: { before, after }` as transient UI feedback. Not persisted — ATS panel in review screen recomputes live from job entry data.

### Step 20 — Pipeline State Update *(extension only)*
`updateJobTrackerStatus() → RESUME_READY` + `mergeJobEntryMetadata()`. Records `lastTailoredAt`, `pipelinePhases`, `sourceProfileId`. Extension runs enhance automatically in background as part of a multi-phase pipeline — status machine must know the tailor phase completed.

### Step 21 — Quota + Usage Log *(job apply + extension, AI path only)*
Increment quota counters in DB. Log tokens, model ID, estimated cost via `recordUsageLogForUser()`. Skipped on onboarding (deterministic). Skipped when deterministic fallback runs.

### Step 22 — Manual Flow / Real-time Validation *(UI layer — PENDING, all surfaces)*
Shown in both diagrams at the bottom. Sentence count, word count, banned words, skills rules, prose block — all validated in real time as the user types in the manual text area. **NOT YET IMPLEMENTED.** Currently the manual textarea has no validation beyond an 8000 char limit.

---

## Step matrix

| Step | Onboarding | Dashboard | Extension | Status |
|---|---|---|---|---|
| 0. Preflight gate | — | ✅ | — | ✅ migrated to resolveFeature |
| 1. Load resume | ✅ | ✅ | ✅ | ✅ |
| 2. Validate input | ✅ | ✅ | ✅ | ✅ |
| 3. O*NET vocabulary | ✅ | ✅ | ✅ | ✅ |
| 4. Keyword gap | — | ✅ | ✅ | ✅ |
| 5. fast-rake + wink-nlp | — | ✅ | ✅ | ✅ jd-nlp-extractor.ts |
| 6. Bullet quality | ✅ | ✅ | ✅ | ✅ |
| 7. ATS parse simulation | — | ✅ | ✅ | ✅ |
| 8. JD brain + cache | — | ✅ | ✅ | ✅ |
| 9. Summary + Skills rules | ✅ | ✅ | ✅ | ✅ structured logging + enforcement |
| 10. Build enhance directive | — | ✅ | ✅ | ✅ |
| 11. AI gates G1–G6 | — | ✅ | ✅ | ✅ resolveFeature("enhance") |
| 12. ATS score BEFORE | — | ✅ | — | ✅ |
| 13. Enhance engine | deterministic | AI + fallback | AI + fallback | ✅ |
| 14. Post-process + Rules | — | ✅ | ✅ | ✅ structured logging + enforcement |
| 15. Diff changed sections | ✅ | ✅ | ✅ | ✅ |
| 16. Extract overrides | — | ✅ | ✅ | ✅ |
| 17. Persist | base profile | job_resume_tailor | job_resume_tailor | ✅ |
| 18. Cover letter seed | — | ✅ | ✅ | ✅ |
| 19. ATS score AFTER | — | ✅ | — | ✅ transient UI only |
| 20. Pipeline state update | — | — | ✅ | ✅ |
| 21. Quota + usage log | — | ✅ AI only | ✅ AI only | ✅ |
| 22. Manual flow validation | ✅ | ✅ | — | ✅ RefineryPanel skills + summary hints |

---

## What is implemented vs pending

### Implemented ✅
- Steps 1–4, 6–8, 10, 13, 15–21 — all functional in code
- JD Segmentation (`jd-segmenter.ts`)
- mustAddSkills + O*NET merge
- `buildEnhanceIntelligenceContext()` — orchestrates pre-processing context
- `EnhancePlan` / `ResumeEnhanceDirective`
- `resolveAiRoute()`, AI call, basic post-process
- Deterministic fallback (`deterministicEnhance()`, `runDeterministicResumeEnhance()`)
- Fallback leaves summary intact, flags only
- Features framework (`lib/features/`)

### Completed in session 2026-06-26
- `enhanceWithAiOnboarding` feature flag — deleted entirely
- `isEnhanceOnboardingVisible()` — deleted
- `fetchEnhanceOnboardingAvailable()` — deleted
- Onboarding enhance button always rendered, no flag gate
- `fallbackUsed: boolean` renamed to `engineMode: "ai" | "deterministic"` across all types and callers
- Features framework built with `enhance` and `subscription` registered
- `resolve-enhance.ts` — onboarding exits early, all other surfaces check G2–G6

### Completed in session 2026-06-26 (Phase 1)
- **Step 5: fast-rake + wink-nlp POS filter** — `jd-nlp-extractor.ts`, rake-js + wink-nlp installed
- **Step 9 + 14: Summary + Skills Rules enforcement** — `post-process.ts` strips banned words, structured `logEnhance` for every rule trigger
- **Step 22: Manual flow real-time validation** — `RefineryPanel.tsx` shows skills count, count warning, and banned soft-skills list in real time
- **Onboarding flow cleanup** — `buildOnboardingIntelligenceContext` (lite: O*NET + bullet quality only, no JD), O*NET implicit skills flow through `directive.mustAddSkills`
- **Migrate `enhance-resume-for-user.ts`** — uses `resolveEnhanceFeature()` exclusively, no inline gates
- **Migrate `checkEnhanceWithAiPreflight()`** — uses `resolveFeature("enhance", ...)`, no duplicate logic
- **Tests for features framework** — `resolve-enhance.test.ts` (10 tests), `resolve-subscription.test.ts` (6 tests)
- **Unified post-enhance** — `lib/job-tracker/persist-enhanced-resume.ts` shared by dashboard and extension
- **Structured logging** — every pipeline step has `logEnhance` with step ID, traceId, and relevant payload

### Pending — Phase 2
- BGE-small semantic scoring (Option 3 in original diagram)

### Phase 2 (future)
- BGE-small semantic scoring (Option 3 in original diagram)

---

## AI switches — in order, first failing gate wins

All 6 gates run inside `resolveFeature("enhance", ...)` via `lib/features/resolve-enhance.ts`.

| # | Gate | Source | Block type |
|---|---|---|---|
| G1 | `EASYSUBMIT_AI_GLOBALLY_ENABLED` env | Server env | Deterministic (silent) |
| G2 | Feature flag per surface (`enhanceWithAiOnboarding` / `enhanceWithAiResumeProfile`) | DB `feature_flags` | Hard block |
| G3 | `user.aiSourcePreference === "disabled"` | `users` table | Deterministic (silent) |
| G4 | `featureFlags.systemAiEnabled` off | DB `feature_flags` | Forces customer mode only |
| G5 | Route resolution: pool health, vault key, provider validity | system key pool + `users` table | Hard block |
| G6 | Daily quota — customer mode + non-subscribed + no admin bypass | `users` table + `app_config` | Hard block |

**Onboarding exits after G2** — AI is intentionally never attempted. G3–G6 are never reached.  
**System mode skips G6** — quota is tracked but not enforced as a hard block for system users.  
**Subscribed users skip G6** entirely.  
**G4 is not a block** — just changes routing mode to customer-only.

---

## Features Framework

**Location:** `lib/features/`  
**Full rules:** `docs/features-framework.md`  
**Cursor reference:** `docs/cursor-prompts/07-features-framework.md`

### The rule
Any feature that depends on a flag, config, quota, subscription state, or routing decision must be registered here. Never call `getFeatureFlags()`, `getAppConfig()`, `isSubscribed()`, or `resolveAiRoute()` directly in a server action.

### Usage
```ts
import { resolveFeature } from "@/lib/features";

const enhance = await resolveFeature({ feature: "enhance", userId, surface: "job_apply" });
const sub = await resolveFeature({ feature: "subscription", userId, surface: "job_apply" });
```

### Registered features
- `enhance` — `lib/features/resolve-enhance.ts`
- `subscription` — `lib/features/resolve-subscription.ts`

### Surface enum
```ts
type FeatureSurface = "onboarding" | "job_apply" | "resume" | "extension"
```

### Design decisions made
- **Framework owns the surface→flag mapping** — not the caller, not CLAUDE.md, not the server action
- **Feature is the noun, surface is the adjective** — `enhance` is one feature, surface just shapes how it runs
- **Generic registry pattern** (`resolveFeature("enhance", ...)`) over typed per-feature functions — easier to extend, one entry point
- **Resolved object contains everything downstream needs** — no raw flags, no config objects, no Prisma rows leak out
- **Features can depend on each other** — `resolve-enhance` can call into subscription state; subscription becomes a shared primitive

### Migration status
Complete. `enhance-resume-for-user.ts` calls `resolveEnhanceFeature()` exclusively. `checkEnhanceWithAiPreflight()` calls `resolveFeature("enhance", ...)`. No inline gate logic remains in callers.

### Next session — what to build
1. **Onboarding flow cleanup** — bypass `buildEnhanceIntelligenceContext` entirely on onboarding path; run O*NET + bullet quality only, no empty-JD calls
2. **Unify dashboard + extension post-enhance** — one shared function, `variant` controls side effects (pipeline state, ATS delta)
3. **Migrate `enhance-resume-for-user.ts`** to `resolveFeature("enhance", ...)`
4. **Migrate `checkEnhanceWithAiPreflight()`** — remove duplicate gate logic
5. **Tests for features framework**
6. **Step 5: fast-rake + wink-nlp** keyword extraction
7. **Steps 9 + 14: Rules enforcement** on summary + skills

---

## Files quick reference

| What | Where |
|---|---|
| Features framework entry | `lib/features/index.ts` |
| Enhance resolver | `lib/features/resolve-enhance.ts` |
| Subscription resolver | `lib/features/resolve-subscription.ts` |
| Feature types | `lib/features/types.ts` |
| Framework rules (full) | `docs/features-framework.md` |
| Cursor prompt | `docs/cursor-prompts/07-features-framework.md` |
| Pre-processing orchestrator | `lib/ai/build-enhance-intelligence-context.ts` |
| Deterministic fallback | `lib/ai/run-deterministic-resume-enhance.ts` |
| Current enhance action (to migrate) | `lib/ai/enhance-resume-for-user.ts` |
| JD segmenter | `lib/job-tracker/jd/jd-segmenter.ts` |
| Keyword extract (needs fast-rake upgrade) | `lib/job-tracker/jd/keyword-extract.ts` |
| O\*NET + mustAddSkills | `lib/job-tracker/ats/job-intelligence.ts` |
| Deterministic enhancer | `lib/job-tracker/ats/deterministic-enhancer.ts` |
