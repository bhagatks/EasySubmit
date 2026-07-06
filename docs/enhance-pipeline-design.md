# Enhance Pipeline — Design Reference

Captured from design session 2026-06-26. Updated 2026-06-28 with diagnostic logging (`[EnhanceDiag]`) + threshold config. Read this before touching any AI enhance, features framework, or onboarding/job-apply flow code.

**QA / regression:** Repeated AI on/off testing protocol, defect registry, and case history → [`docs/enhance-qa-playbook.md`](./enhance-qa-playbook.md).

---

## What "Enhance" means

"Enhance with AI" (or just "Enhance") is a single feature with one name regardless of surface. The surface changes what context is available (JD or not) and which engine runs (AI or deterministic), but the user-facing action is always the same thing.

---

## Two flows: Onboarding vs Job Apply / Extension

### Onboarding flow
- Input: Raw Form + Target Role — **no JD attached**
- Trigger: **Automatic after resume upload** — `enhanceResumeOnboarding()` in `app/onboarding/page.tsx` (`handleFuelParsed`) runs pipeline Steps **3, 6, 9, 10, 13, 14** before Refinery is shown. Failures are non-fatal (user sees raw parsed form). **Enhance with AI button removed** from onboarding — no manual enhance action.
- Engine: **Deterministic only** — AI call is intentionally skipped
- Pre-processing: O*NET vocabulary + bullet quality + Summary/Skills rules only. JD steps (segmentation, fast-rake, keyword gap, ATS parse, JD brain, directive) are all skipped — no JD exists
- Output saved to: **base resume profile** (on finalize, not at upload)
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

### Max-ATS mode (2026-07-03)
Default brain mission for job apply / extension when AI is enabled:

1. **`buildAtsOptimizationSpec()`** (`lib/job-tracker/ats/build-ats-optimization-spec.ts`) — packages the same readiness pillars, keyword gap, platform strategy, and JD directive shown on the ATS panel.
2. **Single AI pass** — `runResumeEnhance` sends the spec + resume skeleton; regenerates summary, all experience bullets, and all optional sections for maximum score.
3. **Skills-only baseline** when AI runs — deterministic merge fills skills to 20 (no cross-domain 6-cap); summary/bullets stay raw until AI.
4. **AI failure fallback** — full deterministic baseline (`applyBaselineEnhance` mode `full`); pipeline debug marks `ai_pass1` as `warning` (not error) so UI shows success.
5. **No full JD** — requires job title + company (extension tailor, dashboard Review enhance); uses `role_company` optimization mode.

### Fork/join light path (2026-07-04)
Extension / job-entry enhance uses **parallel tracks** after capture, then a **light skills merge**, then resume AI. Heavy analysis runs only on AI failure.

```
CAPTURED
  ├─ JOB TRACK (pre_jd_skills → pre_jd_brain → ai_jd_extract)
  └─ RESUME TRACK (profile_load → pre_rules → pre_resume_context)
         │
         ▼
  LIGHT MERGE (pre_skills_merge) — skills only
         ▼
  AI #2 (ai_pass1) — slim experience facts + no old summary
         │
    fail ▼
  Full buildEnhanceBrief + applyBaselineEnhance(full)
```

| Module | Role |
|--------|------|
| `pipeline-track-coordinator.ts` | In-flight promises; capture starts both; tailor awaits |
| `run-job-analysis-track.ts` | Job-only JD skills + JD brain + JD AI |
| `run-resume-prep-track.ts` | Profile + rules + slim experience fact ledger |
| `build-experience-prompt-context.ts` | Recency tiers + deterministic fact lines |
| `light-skills-merge.ts` | mustHaveSkills vs resume skills |
| `build-light-enhance-brief.ts` | Minimal brief (`lightPath: true`) for resume AI |

Happy-path resume AI prompt omits readiness/gap/weak-bullet lists; experience bullets are **source facts**, not full prose. When a raw resume is available, the prompt includes a bounded source fact bank (up to 12k chars) so AI can select and compress named products, partners, patents, awards, platform names, and real metrics before rewriting. Post-AI grounding still uses full experience text from the base profile, and aligned technical job-apply summaries may open with the target role/theme instead of being forced back to the current job title.

**Pipeline debug steps** (`PIPELINE_DEBUG_STEP_DEFS` in `src/shared/extension/pipeline-debug-types.ts`) use architecture **groups**: Capture → Job track ∥ Resume track → Gate → Light merge → Fallback (happy-path skipped) → AI gates → Engine → AI calls → Persist → Complete.

**QA UI** — `/dashboard/pipeline` (`PipelineDebugWorkspace`) groups live steps by those tracks, shows a fork/join legend, and per-group progress badges. Extension overlay uses the same `step.group` labels.


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
- Dashboard + Extension → job title required; JD ≥ 120 chars **or** job title + company name (short-JD / `role_company` path); sanitize via `sanitizeString()`

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

AI enrichment (`extractJDIntelligenceWithAI`) pre-checks daily quota (global OpenRouter budget → per-user cap), logs to `api_call_logs` as `ai.enhance.generate_object`, and counts toward `aiCallsToday`. System pool is mixed-provider: slot 0 OpenRouter `openrouter/free` with `:free` response guard (`src/lib/ai/engine/openrouter-free-adapter.ts`), slot 1 DeepSeek paid overflow. BYOK routing unchanged. Resume `generateText` on DeepSeek/Gemini uses `gemini-resilience.ts`; OpenRouter free uses the dedicated adapter.

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
`postProcessProfessionalSummary()` and `postProcessSkillsText()` in `src/lib/ai/engine/post-process.ts` — strip banned summary words and banned/prose skills; structured `logEnhance` on every rule trigger. Runs on **AI output and the deterministic path** (`runDeterministicResumeEnhance()` applies the same helpers after `deterministicEnhance()`). **All surfaces that run Step 13.**

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

### Step 22 — Manual Flow / Real-time Validation *(UI layer — all Refinery surfaces)*
`validateResume()` in `lib/resume/validation/index.ts`. Section validators wrap `validateSummary()` / `validateSkillsManual()` — UI and server actions call **`validateResume()` only**, never the low-level helpers directly. RefineryPanel shows live hints; `completeOnboarding()`, `saveResumeProfileStudio()`, and `saveJobResumeStudio()` gate on `canFinalize`. See `docs/cursor-prompts/08-resume-validation-framework.md`.

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
| 14. Post-process + Rules | ✅ | ✅ | ✅ | ✅ AI + deterministic (`post-process.ts`) |
| 15. Diff changed sections | ✅ | ✅ | ✅ | ✅ |
| 16. Extract overrides | — | ✅ | ✅ | ✅ |
| 17. Persist | base profile | job_resume_tailor | job_resume_tailor | ✅ |
| 18. Cover letter seed | — | ✅ | ✅ | ✅ |
| 19. ATS score AFTER | — | ✅ | — | ✅ transient UI only |
| 20. Pipeline state update | — | — | ✅ | ✅ |
| 21. Quota + usage log | — | ✅ AI only | ✅ AI only | ✅ |
| 22. Manual flow validation | ✅ | ✅ | — | ✅ `validateResume()` in RefineryPanel + server gates |

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
- Onboarding auto-enhance after upload — `enhanceResumeOnboarding()`; Enhance with AI button removed from onboarding UI
- Resume validation framework — `lib/resume/validation/`; RefineryPanel + server finalize gates
- Deterministic Step 14 — `postProcessProfessionalSummary` + `postProcessSkillsText` on `runDeterministicResumeEnhance()`
- Sign-out clears all EasySubmit web client storage (`lib/auth/client-storage.ts`)
- `fallbackUsed: boolean` renamed to `engineMode: "ai" | "deterministic"` across all types and callers
- Features framework built with `enhance` and `subscription` registered
- `resolve-enhance.ts` — onboarding exits early, all other surfaces check G2–G6

### Completed in session 2026-06-26 (Phase 1)
- **Step 5: fast-rake + wink-nlp POS filter** — `jd-nlp-extractor.ts`, rake-js + wink-nlp installed
- **Step 9 + 14: Summary + Skills Rules enforcement** — `post-process.ts` strips banned words, structured `logEnhance` for every rule trigger
- **Step 22: Manual flow real-time validation** — `validateResume()` framework in RefineryPanel + server gates (see `docs/cursor-prompts/08-resume-validation-framework.md`)
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

## Observability — diagnostic logging (`[EnhanceDiag]`)

Every enhance transaction is traceable in the dev terminal via structured logs prefixed **`[EnhanceDiag]`** (separate from legacy **`[EnhanceAI]`**).

### Config — `app_config.enhanceDiagnostics`

| Field | Values | Default | Purpose |
|-------|--------|---------|---------|
| `enabled` | `boolean` | `true` | Master switch for diagnostic console lines |
| `logThreshold` | `light` \| `low` \| `high` | `light` | Minimum event severity to print |

**Threshold semantics** (higher config = fewer lines):

| Config | Emits |
|--------|--------|
| `light` | **All** events — step internals, flag values, counts (early-stage default) |
| `low` | `low` + `high` — step completions with key params |
| `high` | **Critical only** — boundaries, gate blocks, failures |

Env overrides (local dev, no DB write):

- `EASYSUBMIT_ENHANCE_DIAGNOSTICS_ENABLED=false`
- `EASYSUBMIT_ENHANCE_DIAGNOSTICS_THRESHOLD=high`

Example DB row:

```json
{
  "enabled": true,
  "logThreshold": "light"
}
```

### Event severity on each log line

| Level | When to use | Examples |
|-------|-------------|----------|
| `light` | Verbose internals | Gate passed, cache hit, O\*NET counts |
| `low` | Step done + params | JD brain domain, keyword gap %, directive skills |
| `high` | Boundaries & failures | `session.start`, `pipeline.complete`, `gate.block`, `engine.run.error` |

### Tracks (grep helpers)

| Track | Design steps | What failed here |
|-------|--------------|------------------|
| `jd` | 4, 5, 8, 10 | Keyword gap, NLP, JD brain, directive |
| `resume` | 1–3, 6–7, 9, 11–16, 19 | Form load, O\*NET, bullets, baseline, diff |
| `gate` | 0, 11, G1–G6 | AI off, feature flags, route, quota |
| `engine` | 13 | Model calls, BYOK decrypt, provider errors |
| `persist` | 17–18, 21 | Tailor row, cover letter, quota |
| `pipeline` | 20 | Extension apply phases |

### Standard log fields

Every `[EnhanceDiag]` line includes:

- `traceId` — correlate with PostHog + `api_call_logs`
- `designStep` — `"8"`, `"13"`, `"G5"`, … (matches step matrix above)
- `track` — `jd` \| `resume` \| `gate` \| `engine` \| …
- `phase` — `start` \| `done` \| `skip` \| `fail` \| `block`
- `step` — runtime pipeline id (e.g. `27c_ai_upgrade_fail`)
- `flags` — gate inputs, route mode, cache hits, feature flags
- `params` — counts, previews, error payloads
- `errorCode` / `errorMessage` — on `fail` / `block`

### Failure triage (read logs top → bottom for one `traceId`)

| Symptom in UI | Grep terminal | Likely design step |
|---------------|---------------|-------------------|
| “AI disabled in settings” | `gate.block` + `G3` | Step 11 / G3 |
| Baseline only, no API rows | `engine.run.error` or `pipeline.ai.fail` | Step 13 |
| `provider_error`, `api_call_count: 0` | `engine.vault_decrypt_failed` or `engine.model.call.error` (BYOK provider throw — now logged to `api_call_logs`) | Step 13 / G5 BYOK |
| JD skills empty | `brief.jd_skills` | Step 8 |
| Keyword gap chip wrong | `brief.keyword_gap` | Step 4 |
| Quota block | `gate.block` + `G6` | Step 21 / G6 |

### Code map

| Module | Role |
|--------|------|
| `src/lib/services/enhance-diagnostics-config.ts` | `app_config` parse + threshold filter |
| `src/lib/ai/engine/enhance-diagnostics-catalog.ts` | Design step ↔ pipeline step registry |
| `src/lib/ai/engine/enhance-diagnostics.ts` | `logEnhanceDiag`, `logEnhanceGate`, session |
| `lib/features/resolve-enhance.ts` | G1–G6 gate logs |
| `lib/job-tracker/enhance/build-enhance-brief.ts` | JD + resume pre-process logs |
| `lib/job-tracker/enhance/run-resume-enhance-pipeline.ts` | Transaction wrapper + outcome |
| `src/lib/ai/engine/run-enhance.ts` | Model call start/success/fail + parse errors |

PostHog `resume_journey_step` remains unchanged; diagnostics are **dev terminal first** (same gating as `[EnhanceAI]` — off in production deploys).

---

## Platform strategy layer (2026-07-03)

Per-job ATS platform is detected from the tracker row’s `canonicalUrl` + persisted `platform` field (URL fingerprint at capture via `resolveJobTrackerPlatform`). The enhance brief carries `platform.id`, `platform.strategy`, and `platform.strategyInstructions`.

### Strategy archetypes

| Strategy | Emphasis in AI enhance brief |
|----------|------------------------------|
| `keyword_search` | Exact JD phrasing, acronym + spelled-out skill forms, repeat top 3–5 skills across summary/skills/bullets |
| `ai_match` | Skills-taxonomy breadth (JD + O\*NET/ESCO), mirror stated years/must-haves/certs in plain text |
| `parse_first` | Standard job titles, strict MM/YYYY dates, canonical cert names; keywords secondary |
| `human_review` | Readable quantified bullets, tight summary; keyword density dialed down |
| `unknown` | Treated as `keyword_search` |

Resume export format and section order (`docs/resume/RULES.md`) are **never** changed per platform — strategy adjusts scoring emphasis, ATS panel tips, and enhance instructions only.

### Platform set (prioritized)

- **Core 20 + ORC (required):** linkedin, indeed, greenhouse, workday, lever, ashby, smartrecruiters, icims, taleo, jobvite, successfactors, workable, bamboohr, adp, rippling, jazzhr, paylocity, paycom, clearcompany, teamtailor, **oraclecloud**
- **Recommended:** breezy, recruitee
- **Optional (phase 3):** wellfound, ziprecruiter, phenom — detection + `ai_match` rules; Phenom is a careers-page front-end (e.g. CVS), not a separate apply surface

Site adapter expansion (Phase 2 field scraping) is a **separate follow-up** — not part of this layer.

### Code map

| Module | Role |
|--------|------|
| `src/shared/ats-platform-detection.ts` | Canonical URL patterns + `resolveJobTrackerPlatform` at capture |
| `lib/job-tracker/ats/platform-rules.ts` | Per-platform rules + `strategy` + ATS panel tips |
| `lib/job-tracker/ats/platform-strategy-instructions.ts` | Strategy instruction blocks for AI prompts |
| `lib/job-tracker/enhance/build-enhance-brief.ts` | Resolves platform → attaches `brief.platform` |
| `lib/job-tracker/ats/build-ats-optimization-spec.ts` | Packages readiness pillars, keyword gap, platform strategy, JD directive (same as ATS panel) |
| `lib/job-tracker/enhance/max-ats-helpers.ts` | `hasFullJd`, `hasRoleCompanyContext`, AI-fail UX helpers |
| `src/lib/ai/engine/brain.ts` | Single-pass max-ATS prompts via `buildAtsOptimizationSpec()` + platform strategy |
| `src/lib/ai/engine/run-enhance.ts` | Single AI pass; no pass-2 / `partialEnhance` |
| `lib/job-tracker/enhance/apply-baseline-enhance.ts` | `mode: "full" \| "skills_only"` — skills-only when AI runs |
| `components/dashboard/review/AtsPanel.tsx` | Shows detected platform label + strategy tip |

Diagnostics: `[EnhanceDiag]` events `brief.platform` and `enhance.strategy.impact` log `atsPlatform` + `atsStrategy` (+ post-pipeline readiness delta on step 15).

**Runbooks:** [PLATFORM_ADDITION_RUNBOOK.md](PLATFORM_ADDITION_RUNBOOK.md) (add a platform) · [TALEO_TO_ORC_MIGRATION.md](TALEO_TO_ORC_MIGRATION.md) (Taleo → ORC user guide)

---

## Files quick reference

| What | Where |
|---|---|
| Features framework entry | `lib/features/index.ts` |
| Enhance resolver | `lib/features/resolve-enhance.ts` |
| Subscription resolver | `lib/features/resolve-subscription.ts` |
| Feature types | `lib/features/types.ts` |
| Framework rules (full) | `docs/features-framework.md` |
| Cursor prompt (features) | `docs/cursor-prompts/07-features-framework.md` |
| Cursor prompt (validation) | `docs/cursor-prompts/08-resume-validation-framework.md` |
| Validation entry | `lib/resume/validation/index.ts` |
| Onboarding auto-enhance action | `app/actions/ai/enhance-resume.ts` → `enhanceResumeOnboarding()` |
| Pre-processing orchestrator | `lib/ai/build-enhance-intelligence-context.ts` |
| Deterministic fallback | `lib/ai/run-deterministic-resume-enhance.ts` |
| Current enhance action (to migrate) | `lib/ai/enhance-resume-for-user.ts` |
| JD segmenter | `lib/job-tracker/jd/jd-segmenter.ts` |
| Keyword extract (needs fast-rake upgrade) | `lib/job-tracker/jd/keyword-extract.ts` |
| O\*NET + mustAddSkills | `lib/job-tracker/ats/job-intelligence.ts` |
| Deterministic enhancer | `lib/job-tracker/ats/deterministic-enhancer.ts` |
| ATS optimization spec | `lib/job-tracker/ats/build-ats-optimization-spec.ts` |
| Max-ATS helpers | `lib/job-tracker/enhance/max-ats-helpers.ts` |
| Pipeline orchestrator | `lib/job-tracker/enhance/run-resume-enhance-pipeline.ts` |
| Extension tailor | `lib/extension/pipeline-tailor.ts` |
| Review enhance | `lib/job-tracker/enhance-review-documents.ts` |
