# North Star — Resume Enhance Pipeline

**Status:** Implemented (2026-06-27)  
**Last updated:** 2026-06-27 (full pipeline + JDSkillsFramework shipped)  
**Scope:** Resume enhance only. Cover letter excluded (offline deterministic path stays separate).

This document captures the target architecture agreed in design sessions. Use it as the single source of truth so we do not re-litigate context in every session.

**Screen inventory:** [`SCREENS.md`](./SCREENS.md) — full route/screen map; enhance trigger surfaces (F1–F7) below cross-reference this doc.

---

## 1. North star (one sentence)

**Always analyze the resume into a structured brief, always apply a deterministic baseline transform, then optionally let AI refine that baseline — AI on/off only gates phase 3; failures return baseline + warning, not error.**

---

## 2. Three phases

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1 — ANALYZE (always)                                       │
│ Parse resume (+ JD when present) → ResumeEnhanceBrief            │
│ "Fine print" — validation, gaps, weak bullets, readiness score   │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 2 — BASELINE APPLY (always)                                │
│ Transform form using brief — zero LLM                            │
│ Skills · bullets · JD weave · summary · taper                    │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3 — AI UPGRADE (conditional)                               │
│ Input = baselineForm + brief — NOT raw form                      │
│ Success → aiForm · Fail/OFF/quota → baselineForm + warning       │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 4 — POST + PERSIST                                         │
│ Post-process · diff · readiness delta · persist · quota (AI ok)  │
└──────────────────────────────────────────────────────────────────┘
```

### Decision rules (frozen)

| Rule | Detail |
|------|--------|
| Baseline always runs | When enhance is invoked and validation passes |
| AI never sees raw form | `runResumeEnhance({ form: baselineForm, brief })` |
| AI failure ≠ enhance failure | `success: true`, `engineMode: "deterministic"`, `warning` set |
| Quota / no key / pool down | Baseline + warning (not hard error) |
| Hard errors only | Auth, feature flag off, JD too short (job flows), baseline throw |
| JD weave | Phase 2 only, experience bullets, when JD exists |
| Gaps never invented | Surfaced in brief + UI; user adds manually |
| Onboarding | Same 3 phases; Phase 1 skips JD; Phase 3 never runs (by design today) |
| Cover letter | Out of scope — do not wire into this pipeline |

---

## 2.1 Three intelligence frameworks (parallel layers)

Enhance intelligence is split into **three frameworks** — each answers a different question. Do not conflate them.

| Framework | Question | Input | Output | Module |
|-----------|----------|-------|--------|--------|
| **Features Framework** | May AI run? | User, surface, flags, quota, BYOK | `baselineAvailable`, `aiAvailable`, route | `lib/features/resolve-enhance.ts` |
| **Role Skills Framework (O\*NET)** | What does this **occupation** expect? | Target role / job title | `OnetRoleVocabulary` (skills, tools) | `lib/job-tracker/ats/onet-service.ts` |
| **JD Skills Framework** | What does **this posting** require? | JD text (+ optional title) | `JdSkillsVocabulary` (ranked skills) | **NEW** `lib/job-tracker/jd/jd-skills-service.ts` |

```
                    ┌─────────────────────┐
                    │  Features Framework  │  → gates Phase 3 only
                    └─────────────────────┘

     JD text ──► ┌─────────────────────┐     ┌──────────────────────┐
                 │ JD Skills Framework │     │ Role Skills (O*NET)  │
                 │  (posting-specific) │     │  (occupation norms)  │
                 └─────────┬───────────┘     └──────────┬───────────┘
                           │                            │
                           ▼                            ▼
                    Skills Group 1                 Skills Group 2
                    (JD first, ≤20)           (resume + O*NET fill)
                           └──────── merge-skills-grouped ────────┘
```

**JD Brain** (`jd-brain.ts`) remains the **orchestrator for JD analysis** (segments, seniority, tier keywords, directive). **JDSkillsFramework** is the **skills vocabulary layer** inside Phase 1 — it feeds Group 1 skills and enriches atoms/coverage. JD Brain `mustAddSkills` becomes a **consumer** of `JdSkillsVocabulary`, not the sole extractor.

---

## 3. Trigger surfaces (all entry points)

Every user-visible enhance path must converge on **one server orchestrator**.

### 3.1 Surface map

| ID | Surface | User action | JD | `FeatureSurface` | `variant` |
|----|---------|-------------|-----|------------------|-----------|
| **F1** | Onboarding | Auto after resume upload | ❌ empty | `onboarding` | `"onboarding"` |
| **F2** | Extension job apply | Save job → auto tailor | ✅ required ≥120 | `extension` | `"pipeline"` |
| **F3** | Dashboard Review Screen | "Enhance" on resume tab | ✅ required ≥120 | `job_apply` | `"dashboard"` |
| **F4** | Extension card | Manual enhance API | ✅ required ≥120 | `extension` | `"dashboard"`* |
| **F5** | Resume Studio | Enhance button + JD dialog | ✅ user pastes | `job_apply` | `"dashboard"` |
| **F6** | Base Resume Studio | Enhance button (JD optional) | ⚠️ optional | `resume` | `"dashboard"` |
| **F7** | Dev testing page | Test harness | ✅ | `job_apply` | `"dashboard"` |

\*F4 calls `enhanceJobResumeForUser` which uses `variant: "dashboard"` internally today — consider normalizing to `"extension"` for analytics.

### 3.2 Call graph (today → target)

```
F1  app/onboarding/page.tsx
      └─ enhanceResumeOnboarding()
           └─ runDeterministicResumeEnhance()          ← TARGET: runResumeEnhancePipeline()

F2  lib/extension/apply-pipeline.ts
      └─ runPipelineTailor()
           └─ enhanceResumeForUserId(variant: "pipeline")
                └─ TARGET: runResumeEnhancePipeline()

F3  components/dashboard/ReviewResumePanel.tsx
      └─ enhanceJobResumeFromReview()
           └─ app/actions/review-documents.ts
                └─ enhanceJobResumeForUser()
                     └─ enhanceResumeForUserId(variant: "dashboard")

F4  extension/src/content/index.ts (card enhance)
      └─ POST /api/extension/jobs/[id]/enhance  kind=resume
           └─ enhanceJobResumeForUser()  (same as F3)

F5  components/dashboard/JobResumeStudioEditor.tsx
      └─ useResumeEnhanceFlow()
           └─ enhanceResumeProfile()
                └─ enhanceResumeForUserId(variant: "dashboard")

F6  components/dashboard/ResumeStudioEditor.tsx
      └─ useResumeEnhanceFlow()  (jobDescription may be empty)
           └─ enhanceResumeProfile()
                └─ enhanceResumeForUserId(variant: "dashboard")

F7  app/actions/dev/testing-resume.ts → testRunEnhance()
      └─ enhanceResumeForUserId()
```

**Target:** All paths except F1 (onboarding special-case) call:

```typescript
// lib/job-tracker/enhance/run-resume-enhance-pipeline.ts
export async function runResumeEnhancePipeline(
  input: ResumeEnhancePipelineInput,
): Promise<EnhanceRunResult>
```

F1 calls the same pipeline with `{ allowAiUpgrade: false, hasJd: false }`.

---

## 4. Per-flow behavior (phase-by-phase)

### F1 — Onboarding (`JD empty`)

| Phase | Runs? | What differs |
|-------|-------|--------------|
| 1 ANALYZE | ✅ | No JD Brain, keyword gap, ATS sim, JD atoms, coverage. O*NET + bullet quality + summary/skills fine print + readiness (no keyword pillar weight). |
| 2 BASELINE | ✅ | Skills (O*NET implicit), weak bullets, summary template, taper. **No JD weave.** |
| 3 AI | ❌ | `allowAiUpgrade: false` — onboarding never burns quota |
| 4 POST | ✅ | Return form to Refinery; persist on finalize only (not at enhance time) |

**Entry today:** `app/actions/ai/enhance-resume.ts` → `enhanceResumeOnboarding()`  
**Intelligence today:** `lib/ai/build-onboarding-intelligence-context.ts`  
**Target:** `buildEnhanceBrief({ hasJd: false, surface: "onboarding" })`

---

### F2 — Extension auto-tailor (job apply pipeline)

| Phase | Runs? | What differs |
|-------|-------|--------------|
| 1 ANALYZE | ✅ | Full JD path; cache JD intelligence on `jobTrackerEntry` |
| 2 BASELINE | ✅ | Full baseline + JD weave |
| 3 AI | ✅ if gates allow | Refine baseline; fail → baseline still persisted |
| 4 POST | ✅ | `persistEnhancedResume()` → `job_resume_tailor`; cover seed; `RESUME_READY` status |

**Entry today:** `lib/extension/pipeline-tailor.ts` → `runPipelineTailor()`  
**Triggered from:** `lib/extension/apply-pipeline.ts` on job save when customize enabled  
**Persist today:** `lib/job-tracker/persist-enhanced-resume.ts`

**Target change:** `runPipelineTailor` treats `enhanced.success === true` even when `aiSucceeded === false` + `warning` set. Today quota/no-key returns `success: false` and tailor fails entirely — **must change**.

---

### F3 — Dashboard Review Screen enhance

| Phase | Runs? | What differs |
|-------|-------|--------------|
| 1 ANALYZE | ✅ | Full JD; ATS before score stored transiently |
| 2 BASELINE | ✅ | Full |
| 3 AI | ✅ if gates allow | |
| 4 POST | ✅ | Persist overrides; LaTeX regen; `atsDelta` in response |

**Entry today:**  
- UI: `components/dashboard/ReviewResumePanel.tsx`  
- Action: `app/actions/review-documents.ts` → `enhanceJobResumeFromReview()`  
- Core: `lib/job-tracker/enhance-review-documents.ts` → `enhanceJobResumeForUser()`

**Target UI additions:** Coverage panel, gap hints, amber warning when AI blocked, readiness delta from brief.

---

### F4 — Extension manual enhance (card API)

Same server path as F3.

**Entry today:** `app/api/extension/jobs/[id]/enhance/route.ts`  
**Extension client:** `extension/src/content/index.ts`, `extension/src/content/card-ui.ts`

**Target:** Extension shows success when baseline applied; warning pill when AI skipped.

---

### F5 — Resume Studio

| Phase | Runs? | What differs |
|-------|-------|--------------|
| 1–3 | Same as F3 | User pastes JD in enhance dialog |
| 4 POST | Client-only | Form applied to editor state; user clicks Save → `saveJobResumeStudio()` |

**Entry today:**  
- `components/dashboard/JobResumeStudioEditor.tsx`  
- `components/resume/useResumeEnhanceFlow.tsx`  
- `app/actions/ai/enhance-resume.ts` → `enhanceResumeProfile()`

**Target:** Client handles `success + warning`; never shows red error when baseline returned.

---

### F6 — Base Resume Studio (no job)

| Phase | Runs? | What differs |
|-------|-------|--------------|
| 1 ANALYZE | ✅ | No JD sections in brief when JD empty |
| 2 BASELINE | ✅ | No JD weave |
| 3 AI | ✅ if gates + JD optional | Single AI pass when no JD (no optimize pass 2) |
| 4 POST | Client-only | Save → `saveResumeProfileStudio()` |

**Surface:** `FeatureSurface = "resume"` in preflight.

---

### F7 — Dev testing

`app/actions/dev/testing-resume.ts` → `testRunEnhance()` — mirror of F3 for local QA.

---

## 5. Core types (new files)

### 5.1 `lib/job-tracker/enhance/enhance-brief.ts`

```typescript
export type JdAtom = {
  id: string;
  label: string;           // human-readable responsibility / keyword phrase
  tier: 1 | 2 | 3;
  tokens: string[];        // for matching
};

export type JdCoverageReport = {
  tier1Total: number;
  tier1Covered: number;
  coveragePercent: number;
  coveredBySection: {
    skills: string[];
    summary: string[];
    experience: string[];
  };
  gaps: Array<{
    atom: JdAtom;
    reason: "no_anchor" | "not_grounded";
    suggestedRoleIndex?: number;
  }>;
};

export type ResumeEnhanceBrief = {
  traceId: string;
  surface: FeatureSurface;
  variant: EnhanceResumeProfileInput["variant"];
  targetRole: string;
  hasJd: boolean;
  jobEntryId?: string;

  structural: {
    warnings: string[];
    mashedRolesFound: number;
    experienceEntryCount: number;
    bulletCountsByRole: number[];
    pageBudget: 1 | 2;
  };

  summary: {
    text: string;
    valid: boolean;
    warnings: string[];
    sentenceCount: number;
    wordCount: number;
    bannedWords: string[];
  };

  skills: {
    list: string[];
    jdSkills: string[];       // Group 1 — from JDSkillsFramework
    resumeSkills: string[];   // Group 2 — O*NET + existing, ranked
    overflow?: string[];      // JD skills dropped by SKILLS_HARD_MAX
    warnings: string[];
    banned: string[];
    count: number;
    compositionOk: boolean;
  };

  experience: {
    weakBullets: WeakBulletTarget[];
  };

  jd?: {
    intelligence: JDIntelligence;
    skillsVocabulary: JdSkillsVocabulary;  // JDSkillsFramework output
    directive: ResumeEnhanceDirective;
    keywordGap: KeywordGapResult;
    jobIntelligence: JobIntelligence;
    atoms: JdAtom[];
    anchorScores: Array<{
      atomId: string;
      expIdx: number;
      bulletIdx: number;
      score: number;
    }>;
    coverageBefore: JdCoverageReport;
  };

  onet: OnetRoleVocabulary;
  readiness: ResumeReadinessResult;
  plan: EnhancePlan;
};
```

### 5.2 `lib/job-tracker/enhance/enhance-result.ts`

```typescript
export type EnhanceRunResult =
  | {
      success: true;
      form: HubRefineryForm;
      baselineForm: HubRefineryForm;
      brief: ResumeEnhanceBrief;
      changedSections: StudioEditorSectionId[];
      targetRole: string;

      engineMode: "ai" | "deterministic";
      baselineApplied: true;
      aiAttempted: boolean;
      aiSucceeded: boolean;
      warning?: string;
      aiBlockCode?: EnhanceOffReason | "parse_fail" | "timeout" | "provider_error";

      coverageAfter?: JdCoverageReport;
      readinessDelta?: { before: number; after: number };

      quota: {
        enhancementsUsed: number;
        enhancementsLimit: number;
        callsUsed: number;
        callsLimit: number;
      };
      aiMode: "customer" | "system";
      enhanceSummary: string;
      partialEnhance?: boolean;
      traceId: string;
    }
  | EnhanceResumeProfileFailure;  // hard failures only
```

### 5.3 `lib/job-tracker/enhance/enhance-plan.ts` (extend existing)

Add to `EnhancePlan`:

```typescript
export type EnhancePlan = {
  // ... existing fields ...
  jdAtoms?: JdAtom[];
  jdWeaveAssignments?: Array<{
    expIdx: number;
    bulletIdx: number;
    atomIds: string[];   // max 3
  }>;
};
```

---

## 6. Phase 1 — ANALYZE (implementation)

### 6.1 New orchestrator

**File:** `lib/job-tracker/enhance/build-enhance-brief.ts`

```typescript
export type BuildEnhanceBriefInput = {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  surface: FeatureSurface;
  variant: EnhanceResumeProfileInput["variant"];
  traceId: string;
  userId: string;
};

export async function buildEnhanceBrief(
  input: BuildEnhanceBriefInput,
): Promise<ResumeEnhanceBrief>;
```

### 6.2 Internal steps (method order)

| Step | Function | Source module | Notes |
|------|----------|---------------|-------|
| 1.2.1 | `refineryFormToPrimeResume(form)` | `lib/onboarding/hubResume.ts` | |
| 1.2.2 | `inferResumePagesFromForm(form, targetRole)` | `src/lib/ai/engine/candidate-context.ts` | page budget |
| 1.2.3 | `detectMashedExperience(form)` | `lib/resume/split-mashed-experience.ts` | count only in brief |
| 1.2.4 | `validateSummary(summary)` | `lib/resume/summary-rules.ts` | fine print |
| 1.2.5 | `parseSkillsText` + `validateSkillsSystem` + `findBannedSkills` | `lib/resume/skills-rules.ts` | |
| 1.2.6 | `analyzeBulletQuality(primeData)` | `lib/job-tracker/ats/bullet-quality.ts` | |
| 1.2.7 | `fetchRoleVocabulary(targetRole)` | `lib/job-tracker/ats/onet-service.ts` | Role Skills Framework |
| 1.2.8 | `fetchJdSkillsVocabulary(jd, title?)` | **NEW** `lib/job-tracker/jd/jd-skills-service.ts` | **if JD** — JD Skills Framework |
| 1.2.9 | `analyzeJobDescription(...)` | `lib/job-tracker/jd/jd-brain.ts` | **if JD** |
| 1.2.10 | `buildResumeEnhanceDirective(intel, skills, jdVocab?)` | `lib/job-tracker/jd/jd-directive.ts` | **if JD** — `mustAddSkills` from vocab |
| 1.2.11 | `analyzeKeywordGapFromIntelligence(...)` | `lib/job-tracker/ats/keyword-gap.ts` | **if JD** |
| 1.2.12 | `simulateAtsParse(primeData)` | `lib/job-tracker/ats/ats-parse-simulator.ts` | **if JD** |
| 1.2.13 | `buildJdAtomList(intelligence, directive, jdVocab)` | **NEW** `build-jd-atom-list.ts` | **if JD** — include vocab skills as tier-1 atoms |
| 1.2.14 | `scoreBulletAnchors(form, atoms)` | **NEW** `score-bullet-anchors.ts` | **if JD** |
| 1.2.15 | `buildJdCoverageReport(form, atoms, skills, summary)` | **NEW** `build-jd-coverage-report.ts` | **if JD** |
| 1.2.16 | `computeResumeReadiness(prime, role, jd?)` | `lib/job-tracker/ats/resume-readiness-score.ts` | |
| 1.2.17 | `buildEnhancePlan(form, jobIntel, directive, brief)` | `lib/job-tracker/enhance/enhance-plan.ts` | uses grouped skills from brief |

### 6.3 Onboarding branch (F1)

When `!hasJd && surface === "onboarding"`:

- Skip steps 1.2.8–1.2.15 (JD Skills + JD Brain branch)
- Use logic from `buildOnboardingIntelligenceContext()` inline or call wrapper:
  ```typescript
  buildOnboardingBriefSlice(form, targetRole) → { onet, weakBullets, implicitSkills, directive }
  ```
- **Deprecate** standalone `buildOnboardingIntelligenceContext` once brief builder owns it

### 6.4 JD branch (F2–F7 with JD)

Merge logic from `lib/ai/build-enhance-intelligence-context.ts` into brief builder.

**Deprecate:** `buildEnhanceIntelligenceContext` as public API — internal to pipeline only.

### 6.5 New helper files

#### `lib/job-tracker/enhance/build-jd-atom-list.ts`

```typescript
export function buildJdAtomList(
  intelligence: JDIntelligence,
  directive: ResumeEnhanceDirective,
): JdAtom[];
```

Sources atoms from:
- `intelligence.tier1Keywords` (tier 1)
- `intelligence.tier2Keywords` (tier 2)
- `intelligence.deliverables` / responsibility phrases from JD segments
- `directive.mustWeaveKeywords`
- De-dupe; cap tier-1 at ~25

#### `lib/job-tracker/enhance/score-bullet-anchors.ts`

```typescript
export function scoreBulletAnchors(
  form: HubRefineryForm,
  atoms: JdAtom[],
): Array<{ atomId: string; expIdx: number; bulletIdx: number; score: number }>;
```

Scoring: token overlap + domain keyword match + company/title context. Threshold configurable (default 0.25).

#### `lib/job-tracker/enhance/build-jd-coverage-report.ts`

```typescript
export function buildJdCoverageReport(input: {
  form: HubRefineryForm;
  atoms: JdAtom[];
  targetRole: string;
}): JdCoverageReport;
```

Locates atoms in skills / summary / experience text. Uncovered tier-1 → `gaps[]`.

---

## 7. Phase 2 — BASELINE APPLY (implementation)

### 7.1 New orchestrator

**File:** `lib/job-tracker/enhance/apply-baseline-enhance.ts`

```typescript
export type BaselineEnhanceResult = {
  form: HubRefineryForm;
  changes: {
    skillsAdded: string[];
    bulletsRewritten: number;
    bulletsWoven: number;
    bulletsTrimmed: number;
    summaryRewritten: boolean;
  };
  coverageAfter?: JdCoverageReport;
  enhanceSummary: string;
};

export function applyBaselineEnhance(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
): BaselineEnhanceResult;
```

### 7.2 Internal steps (method order)

| Order | Action | Function | File |
|-------|--------|----------|------|
| 2.1 | Split mashed roles | `splitMashedExperienceInForm(form)` | `lib/resume/split-mashed-experience.ts` |
| 2.2 | Remove skills | `removeSkills(...)` | `apply-enhance-plan.ts` (extract or import) |
| 2.3 | Inject grouped skills | `buildGroupedSkills(...)` → `skillsText` | **NEW** `merge-skills-grouped.ts` |
| 2.4 | Weak bullet rewrite | `rewriteWeakBullets(form, plan.weakBullets)` | `apply-enhance-plan.ts` |
| 2.5 | JD compound weave | `applyJdCoverageWeave(form, brief)` | **NEW** `jd-coverage-pack.ts` |
| 2.6 | Clean bullets | `cleanExperienceBullets(form)` | `apply-enhance-plan.ts` |
| 2.7 | Taper by recency | `taperExperienceEntries(experience, pages)` | `lib/resume/experience-bullet-rules.ts` |
| 2.8 | Summary template | `buildDeterministicSummary(...)` | `lib/job-tracker/enhance/build-deterministic-summary.ts` |
| 2.9 | Post-process | `postProcessProfessionalSummary` + `postProcessSkillsText` | `src/lib/ai/engine/post-process.ts` |
| 2.10 | Coverage after | `buildJdCoverageReport(...)` | if JD |
| 2.11 | Changelog | `buildBaselineChangeSummary(...)` | **NEW** |

### 7.3 JD weave — `lib/job-tracker/enhance/jd-coverage-pack.ts`

```typescript
export function packJdCoverage(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
): Array<{ expIdx: number; bulletIdx: number; atomIds: string[] }>;

export function weaveCompoundBullet(
  bullet: string,
  atoms: JdAtom[],
  company?: string,
): string;

export function applyJdCoverageWeave(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
): { form: HubRefineryForm; bulletsWoven: number };
```

**Algorithm:**
1. Uncovered tier-1 atoms from `brief.jd.coverageBefore.gaps`
2. Greedy set cover: pick bullet covering most atoms (using anchor scores)
3. Assign max 3 atoms per bullet
4. `weaveCompoundBullet` — prepend strong verb, keep original facts/metrics, append JD phrases
5. Atoms with no anchor → stay in `gaps` (never invent bullet)

### 7.4 Refactor existing `applyEnhancePlan`

**Option A (preferred):** `applyEnhancePlan` becomes thin wrapper calling `applyBaselineEnhance` for backward compat in tests.

**Option B:** Move body into `applyBaselineEnhance`; `applyEnhancePlan` deprecated.

**File:** `lib/job-tracker/enhance/apply-enhance-plan.ts` — extract shared helpers:
- `rewriteWeakBullets`
- `rewriteBullet`
- `mergeSkills` / `removeSkills`
- `cleanExperienceBullets`
- `buildChangeSummary` → rename `buildBaselineChangeSummary`

### 7.5 `deterministicEnhancer.ts`

```typescript
// lib/job-tracker/ats/deterministic-enhancer.ts
export function deterministicEnhance(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,  // was: intelligence + directive separately
): DeterministicEnhanceResult;
```

Internally: `applyBaselineEnhance(form, brief)`.

---

## 8. Phase 3 — AI UPGRADE (implementation)

### 8.1 Gate resolution

**File:** `lib/job-tracker/enhance/resolve-ai-upgrade.ts`

```typescript
export type AiUpgradeResolution = {
  aiAllowed: boolean;
  reason?: EnhanceOffReason;
  route?: ResolvedAiRoute;
  warning?: string;
};

export async function resolveAiUpgrade(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts?: { forceSystem?: boolean; useCustomerKey?: boolean },
): Promise<AiUpgradeResolution>;
```

**Changes to `lib/features/resolve-enhance.ts`:**

```typescript
export type EnhanceFeatureResolution = {
  baselineAvailable: true;     // NEW — always true when feature enabled
  aiAvailable: boolean;        // NEW — replaces monolithic `available` for AI
  available: boolean;          // KEEP for backward compat = aiAvailable && !feature_disabled
  reason?: EnhanceOffReason;
  // ... existing route fields when aiAvailable
};
```

| Gate | `aiAvailable` | Baseline runs? |
|------|---------------|----------------|
| G1 globally_disabled | false | yes (same as AI off) |
| G2 feature_disabled | false | **yes** (flag off = AI off, not enhance off) |
| G3 user_disabled | false | yes |
| G4 system off | customer only | yes |
| G5 no route | false | yes + warning |
| G6 quota | false | yes + warning (see §18.2 TODO) |

Onboarding: `aiAvailable = false` **always** — hard-coded; never Phase 3 regardless of global AI or user preference (§18.3).

### 8.2 Main orchestrator

**File:** `lib/job-tracker/enhance/run-resume-enhance-pipeline.ts`

```typescript
export type ResumeEnhancePipelineInput = {
  userId: string;
  user: SystemQuotaUserRow;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  rawResumeText?: string | null;
  surface: FeatureSurface;
  variant: EnhanceResumeProfileInput["variant"];
  traceId: string;
  allowAiUpgrade?: boolean;    // false for onboarding
  forceSystem?: boolean;
  useCustomerKey?: boolean;
};

export async function runResumeEnhancePipeline(
  input: ResumeEnhancePipelineInput,
): Promise<EnhanceRunResult>;
```

**Pseudocode:**

```typescript
async function runResumeEnhancePipeline(input) {
  // Validate
  if (needsJd(input) && jdTooShort(input.jobDescription))
    return hardFail("missing_description");

  // Phase 1
  const brief = await buildEnhanceBrief({ ... });

  // Phase 2
  const baseline = applyBaselineEnhance(input.form, brief);

  // Phase 3
  let finalForm = baseline.form;
  let aiAttempted = false;
  let aiSucceeded = false;
  let warning: string | undefined;
  let aiBlockCode: string | undefined;
  let engineMode: "ai" | "deterministic" = "deterministic";

  if (input.allowAiUpgrade !== false) {
    const ai = await resolveAiUpgrade(input.user, input.surface, ...);
    if (ai.aiAllowed) {
      aiAttempted = true;
      const result = await runResumeEnhance({
        form: baseline.form,
        brief,
        targetRole: input.targetRole,
        jobDescription: input.jobDescription,
        rawResumeText: input.rawResumeText,
        route: ai.route!,
        jobIntelligence: brief.jd?.jobIntelligence,
        enhanceDirective: brief.jd?.directive,
        traceId: input.traceId,
        userId: input.userId,
      });
      if (result.ok) {
        aiSucceeded = true;
        finalForm = result.form;
        engineMode = "ai";
      } else {
        warning = result.error;
        aiBlockCode = result.code;
      }
    } else {
      warning = ai.warning;
      aiBlockCode = ai.reason;
    }
  }

  // Phase 4
  finalForm = postProcessForm(finalForm, input.traceId, input.userId);
  const changedSections = diffChangedSections(input.form, finalForm, false);
  // quota increment only if aiSucceeded
  // ...

  return { success: true, form: finalForm, baselineForm: baseline.form, brief, ... };
}
```

### 8.3 Changes to `lib/ai/enhance-resume-for-user.ts`

Replace body of `enhanceResumeForUserId` with:

```typescript
return runResumeEnhancePipeline({
  userId,
  user,
  form: input.form,
  targetRole: input.targetRole,
  jobDescription: input.jobDescription,
  jobEntryId: input.jobEntryId,
  rawResumeText: input.rawResumeText,
  surface: variantToSurface(input.variant),
  variant: input.variant,
  traceId,
  allowAiUpgrade: input.variant !== "onboarding",
  forceSystem: input.forceSystem,
  useCustomerKey: input.useCustomerKey,
});
```

Remove direct calls to:
- `runDeterministicResumeEnhance` (except onboarding wrapper)
- Inline `buildEnhanceIntelligenceContext` + `runResumeEnhance` split

### 8.4 Changes to `src/lib/ai/engine/run-enhance.ts`

**Input type `RunEnhanceInput` add:**

```typescript
brief?: ResumeEnhanceBrief;
// form is already baselineForm when called from pipeline
```

**Remove:** catch-block `deterministicEnhance()` fallback (lines ~541–570) — baseline already applied.

**Keep:** pass2 partial enhance (pass1 ok, pass2 fail) — returns pass1 as AI success with `partialEnhance: true`.

**`buildCandidateContext`:** use `input.form` (baseline) not raw.

### 8.5 Changes to `src/lib/ai/engine/brain.ts`

**`buildEnhanceUserPrompt` changes:**

- Opening line: `"Refine this pre-enhanced resume for the target role. Do not discard baseline improvements."`
- Include `brief.readiness.topActions` as priority fixes
- Include `brief.jd.coverageAfter.gaps` as "do not fabricate; improve surrounding content only"
- Reduce emphasis on `mustWeaveKeywords` (baseline already woven)

**`buildEnhanceSystemPrompt`:** no change expected.

### 8.6 Deprecate `lib/ai/run-deterministic-resume-enhance.ts`

Fold into pipeline. Onboarding calls:

```typescript
runResumeEnhancePipeline({ ..., allowAiUpgrade: false, variant: "onboarding" })
```

---

## 9. Phase 4 — POST + PERSIST

### 9.1 Post-process (all paths)

```typescript
// Already exists — call on finalForm
postProcessProfessionalSummary(form.professionalSummary, traceId, userId);
postProcessSkillsText(form.skillsText, traceId, userId);
```

### 9.2 Diff

```typescript
diffChangedSections(input.form, finalForm, false);  // vs original user input
```

Also compute:

```typescript
diffChangedSections(baseline.form, finalForm, false);  // AI delta only (logging)
```

### 9.3 Persist paths

| Flow | Persist function | When |
|------|------------------|------|
| F2 pipeline tailor | `persistEnhancedResume()` | always after success |
| F3/F4 review enhance | `persistEnhancedResume()` + `updateJobReviewDocuments()` | after success |
| F5/F6 studio | Client `onApply` | no server persist at enhance time |
| F1 onboarding | None at enhance | save on finalize |

### 9.4 `persistEnhancedResume` extension

**File:** `lib/job-tracker/persist-enhanced-resume.ts`

Add optional metadata to tailor upsert:

```typescript
enhanceMeta: {
  engineMode,
  aiAttempted,
  aiSucceeded,
  aiBlockCode,
  coverageAfter,
  readinessDelta,
  enhanceSummary,
  traceId,
}
```

**Prisma:** add `enhanceMeta Json?` to `JobResumeTailor` or store in existing JSON column if present.

### 9.5 Quota

**File:** `lib/ai/enhance-resume-for-user.ts` (or pipeline)

```typescript
if (aiSucceeded) {
  incrementQuotaPatch(...);
  recordUsageLogForUser(...);
}
// baseline-only runs: no quota increment
```

---

## 10. Pipeline step IDs (logging)

Add to `src/lib/ai/engine/enhance-pipeline.ts`:

```typescript
// Phase 1 — Brief
PRE_BRIEF_START: "78_pre_brief_start",
PRE_BRIEF_STRUCTURAL: "78a_pre_brief_structural",
PRE_BRIEF_SECTIONS: "78b_pre_brief_sections",
PRE_BRIEF_JD: "78c_pre_brief_jd",
PRE_BRIEF_COVERAGE: "78d_pre_brief_coverage",
PRE_BRIEF_READY: "78e_pre_brief_ready",

// Phase 2 — Baseline
BASELINE_START: "26_baseline_start",
BASELINE_SKILLS: "26a_baseline_skills",
BASELINE_BULLETS_WEAK: "26b_baseline_bullets_weak",
BASELINE_JD_WEAVE: "26c_baseline_jd_weave",
BASELINE_SUMMARY: "26d_baseline_summary",
BASELINE_DONE: "26e_baseline_done",

// Phase 3 — AI upgrade
AI_UPGRADE_START: "27_ai_upgrade_start",
AI_UPGRADE_BLOCKED: "27a_ai_upgrade_blocked",
AI_UPGRADE_SUCCESS: "27b_ai_upgrade_success",
AI_UPGRADE_FAIL: "27c_ai_upgrade_fail",

// Deprecate hint text for ENGINE_DETERMINISTIC as "fallback" — rename to "baseline only"
```

Update `ENHANCE_PIPELINE_HINTS` accordingly.

---

## 11. Client / UI changes

### 11.1 Response handling (all enhance clients)

**Files:**
- `components/resume/useResumeEnhanceFlow.tsx`
- `components/dashboard/ReviewResumePanel.tsx`
- `extension/src/content/index.ts`
- `extension/src/content/card-ui.ts`

**Logic change:**

```typescript
if (result.success) {
  applyForm(result.form);
  if (result.warning) showAmberBanner(result.warning);
  else showSuccess();
} else {
  showError(result.error);  // hard failures only
}
```

### 11.2 Preflight

**File:** `app/actions/ai/enhance-resume.ts` → `checkEnhanceWithAiPreflight`

Return:

```typescript
{
  ok: true,
  baselineAvailable: true,
  aiAvailable: boolean,
  systemAiEnabled: boolean,
}
```

Enhance button enabled when `baselineAvailable` (not only when AI available).

### 11.3 Progress overlay

**Files:**
- `components/resume/useEnhanceProgress.ts`
- `src/shared/extension/enhance-progress-overlay.ts`

Steps:
1. Analyzing resume…
2. Applying enhancements…
3. Upgrading with AI… (skip if AI off)
4. Done

### 11.4 Review UI (new)

**File:** `components/dashboard/review/EnhanceCoveragePanel.tsx` (NEW)

Displays:
- `coverageAfter.coveragePercent`
- `coverageAfter.gaps[]`
- `readinessDelta`
- `engineMode` badge

Wire into `components/dashboard/ReviewResumePanel.tsx` + ATS tab in `ReviewScreen.tsx`.

### 11.5 Analytics

**File:** `src/shared/analytics/product-events.ts`

Extend `trackEnhanceCompleted`:

```typescript
{
  engineMode,
  aiAttempted,
  aiSucceeded,
  aiBlockCode,
  coveragePercent,
  gapsCount,
  surface,
}
```

---

## 12. Complete file change manifest

### 12.1 New files

| File | Purpose |
|------|---------|
| `lib/job-tracker/enhance/enhance-brief.ts` | Types: brief, atoms, coverage |
| `lib/job-tracker/enhance/enhance-result.ts` | Types: pipeline result |
| `lib/job-tracker/enhance/build-enhance-brief.ts` | Phase 1 orchestrator |
| `lib/job-tracker/enhance/apply-baseline-enhance.ts` | Phase 2 orchestrator |
| `lib/job-tracker/enhance/run-resume-enhance-pipeline.ts` | **Main entry** |
| `lib/job-tracker/enhance/build-jd-atom-list.ts` | JD atom extraction |
| `lib/job-tracker/enhance/score-bullet-anchors.ts` | Bullet ↔ atom scoring |
| `lib/job-tracker/enhance/build-jd-coverage-report.ts` | Coverage + gaps |
| `lib/job-tracker/enhance/jd-coverage-pack.ts` | Set cover + weave |
| `lib/job-tracker/enhance/build-baseline-change-summary.ts` | Human changelog |
| `lib/job-tracker/enhance/resolve-ai-upgrade.ts` | AI gate → warning |
| `lib/job-tracker/enhance/merge-skills-grouped.ts` | Two-group skills merge + serialize |
| `lib/job-tracker/jd/jd-skills-types.ts` | `JdSkillsVocabulary`, `JdSkillEntry` |
| `lib/job-tracker/jd/jd-skills-service.ts` | **JD Skills Framework** — `fetchJdSkillsVocabulary` |
| `lib/job-tracker/jd/jd-skills-deterministic.ts` | Provider: keyword-extract + jd-extractor |
| `lib/job-tracker/jd/jd-skills-esco.ts` | Provider: ESCO REST normalize (optional) |
| `lib/job-tracker/jd/jd-skills-escox.ts` | Provider: ESCOX sidecar client (optional v2) |
| `lib/job-tracker/jd/jd-skills-service.test.ts` | JD skills extraction fixtures |
| `components/dashboard/review/EnhanceCoveragePanel.tsx` | Gap UI |
| `lib/job-tracker/enhance/*.test.ts` | Tests for each new module |
| `lib/job-tracker/enhance/run-resume-enhance-pipeline.test.ts` | Flow matrix tests |

### 12.2 Major rewrites

| File | Change |
|------|--------|
| `lib/ai/enhance-resume-for-user.ts` | Delegate to `runResumeEnhancePipeline`; map result to existing export types |
| `lib/features/resolve-enhance.ts` | Split `baselineAvailable` / `aiAvailable`; quota → soft block |
| `lib/features/types.ts` | Extend `EnhanceFeatureResolution` |
| `src/lib/ai/engine/run-enhance.ts` | Remove deterministic fallback; accept brief + baseline form |
| `src/lib/ai/engine/brain.ts` | Refine prompt for baseline input |
| `src/lib/ai/engine/candidate-context.ts` | Document baseline form as input |
| `lib/job-tracker/ats/deterministic-enhancer.ts` | Accept `ResumeEnhanceBrief` |
| `lib/job-tracker/jd/jd-directive.ts` | `mustAddSkills` from `JdSkillsVocabulary` when present |
| `lib/job-tracker/enhance/enhance-plan.ts` | Grouped skills from brief; jd atoms + weave |
| `app/actions/ai/enhance-resume.ts` | Preflight + onboarding → pipeline |

### 12.3 Minor updates

| File | Change |
|------|--------|
| `lib/ai/build-enhance-intelligence-context.ts` | Deprecate → logic moved to brief builder |
| `lib/ai/build-onboarding-intelligence-context.ts` | Deprecate → onboarding slice in brief builder |
| `lib/ai/run-deterministic-resume-enhance.ts` | Deprecate → pipeline |
| `lib/job-tracker/enhance/apply-enhance-plan.ts` | Extract helpers; delegate to baseline orchestrator |
| `lib/job-tracker/enhance/build-deterministic-summary.ts` | No API change |
| `lib/resume/experience-bullet-rules.ts` | No API change |
| `lib/resume/split-mashed-experience.ts` | No API change |
| `lib/job-tracker/enhance-review-documents.ts` | Handle new result fields; persist enhanceMeta |
| `lib/extension/pipeline-tailor.ts` | Success on baseline; log warning |
| `lib/job-tracker/persist-enhanced-resume.ts` | Store enhanceMeta |
| `app/actions/review-documents.ts` | Pass through new fields |
| `app/api/extension/jobs/[id]/enhance/route.ts` | Pass through new fields |
| `src/lib/ai/engine/enhance-pipeline.ts` | New step IDs |
| `src/lib/ai/engine/enhance-logger.ts` | Log brief stats |
| `src/lib/ai/engine/post-process.ts` | No change |
| `src/shared/analytics/product-events.ts` | Extended events |
| `components/resume/useResumeEnhanceFlow.tsx` | Warning UX |
| `components/resume/EnhanceWithAiFlow.tsx` | 3-phase progress copy |
| `components/resume/useEnhanceProgress.ts` | Step mapping |
| `components/dashboard/ReviewResumePanel.tsx` | Coverage + warning |
| `components/dashboard/ReviewScreen.tsx` | ATS tab gaps |
| `components/dashboard/JobResumeStudioEditor.tsx` | Warning UX |
| `components/dashboard/ResumeStudioEditor.tsx` | Warning UX |
| `extension/src/content/card-ui.ts` | Warning pill |
| `extension/src/content/index.ts` | Success on baseline |
| `prisma/schema.prisma` | Optional `enhanceMeta Json?` on tailor; optional `jdSkillsVocabulary Json?` + `jdSkillsHash String?` on entry |
| `lib/ai/enhance-resume-for-user.test.ts` | Rewrite expectations |
| `lib/features/resolve-enhance.test.ts` | Soft quota blocks |
| `lib/extension/pipeline-tailor.test.ts` | Baseline success on AI fail |
| `lib/job-tracker/enhance/enhance-plan.test.ts` | JD weave cases |

### 12.4 Do not touch

| File | Reason |
|------|--------|
| `lib/job-tracker/build-deterministic-cover-letter.ts` | Cover letter offline |
| `lib/ai/enhance-cover-letter-for-user.ts` | Cover letter |
| `lib/job-tracker/enhance-review-documents.ts` → `enhanceJobCoverLetterForUser` | Cover letter |
| All cover letter UI | Out of scope |

---

## 13. Method signature migration table

| Current | Target |
|---------|--------|
| `enhanceResumeForUserId(userId, input)` | Same export; body → `runResumeEnhancePipeline` |
| `runDeterministicResumeEnhance({...})` | **Deprecated** → pipeline with `allowAiUpgrade: false` |
| `buildEnhanceIntelligenceContext({...})` | **Deprecated** → `buildEnhanceBrief` |
| `buildOnboardingIntelligenceContext(...)` | **Deprecated** → brief onboarding slice |
| `deterministicEnhance(form, intelligence, directive?, targetRole?)` | `deterministicEnhance(form, brief)` or remove |
| `fetchRoleVocabulary(jobTitle)` | Unchanged — Role Skills Framework |
| `fetchJdSkillsVocabulary(input)` | **NEW** — JD Skills Framework |
| `buildResumeEnhanceDirective(intel, skills, jdVocab?)` | Consumes `JdSkillsVocabulary` for `mustAddSkills` |
| `buildEnhancePlan(form, jobIntel, directive, brief)` | Grouped skills + atoms from brief |
| `applyEnhancePlan(form, plan)` | `applyBaselineEnhance(form, brief)` |
| `runResumeEnhance({ form, ... })` | `form` must be baseline; add `brief?` |
| `resolveEnhanceFeature(user, surface, opts?)` | Returns `baselineAvailable` + `aiAvailable` |
| `checkEnhanceWithAiPreflight(...)` | Returns `baselineAvailable` |
| `enhanceResumeOnboarding(input)` | Calls pipeline `allowAiUpgrade: false` |
| `enhanceJobResumeForUser(userId, jobId)` | Unchanged export; richer result type |
| `runPipelineTailor(userId, input)` | Treat baseline success as tailor success |

---

## 14. Test matrix (must pass before done)

| Case | Flow | Expected |
|------|------|----------|
| AI off, JD job | F3 | baseline, engineMode deterministic, no warning or info |
| AI on, success | F3 | ai form, engineMode ai |
| AI on, pass1 fail | F3 | baseline, warning, success true |
| Quota exceeded | F3 | baseline, warning code quota_exceeded |
| No BYOK | F3 | baseline, warning code no_key |
| Pool down | F2 | baseline persisted, RESUME_READY |
| JD too short | F2 | hard fail, no baseline |
| No JD studio | F6 | baseline without weave |
| Onboarding | F1 | baseline, no AI call |
| iRhythm fixture | F3 | coverage < 100%, gaps listed, no fabricated ISO 13485 |
| Extension card | F4 | same as F3 |

---

## 15. Implementation order

### Wave A — JDSkillsFramework (can ship before full pipeline)

1. **JD Skills types** — `lib/job-tracker/jd/jd-skills-types.ts` (`JdSkillsVocabulary`, `JdSkillEntry`)
2. **Deterministic provider** — wrap existing `keyword-extract` + `jd-extractor` `mustHaveSkills` → unified vocab
3. **ESCO normalize provider** — REST search API for label normalization (free, no self-host)
4. **`fetchJdSkillsVocabulary`** — orchestrator with cache + fallback chain
5. **Wire into brief** — `buildEnhanceBrief` step 1.2.8; persist cache on `jobTrackerEntry`
6. **Tests** — fixture JDs (tech + med device iRhythm); assert CAPA/Tableau when in JD text
7. **Optional v2** — ESCOX sidecar behind `app_config.jdSkills.escoxEnabled` feature flag

### Wave B — 3-phase pipeline core

1. **Types** — `enhance-brief.ts`, `enhance-result.ts`
2. **Phase 1** — `build-enhance-brief.ts` + tests (includes JDSkills step)
3. **Phase 2** — `merge-skills-grouped.ts`, `jd-coverage-pack.ts`, `apply-baseline-enhance.ts` + tests
4. **Pipeline** — `run-resume-enhance-pipeline.ts` + tests
5. **Gates** — `resolve-enhance.ts` soft blocks
6. **Wire router** — `enhance-resume-for-user.ts`
7. **AI engine** — remove fallback, update brain prompt
8. **Surfaces** — tailor, review, studio, extension UI
9. **Persist meta** — prisma + persistEnhancedResume
10. **Deprecate** — old deterministic path files

### Wave C — docs + QA

1. Update `docs/enhance-pipeline-design.md` to reference this doc
2. Create `docs/cursor-prompts/09-baseline-first-enhance.md` at kickoff
3. Run full test matrix §14

---

## 16. Related docs

| Doc | Relationship |
|-----|--------------|
| `docs/north-star.md` | **This doc** — authoritative target architecture |
| `docs/JD_BRAIN_ARCHITECTURE.md` | JD Brain layers — JDSkillsFramework sits alongside, feeds directive |
| `docs/enhance-pipeline-design.md` | Step matrix — update after implementation |
| `docs/features-framework.md` | Gate changes |
| `docs/resume/RULES.md` | Bullet budgets, summary rules |
| `docs/cursor-prompts/07-deterministic-summary.md` | Phase 2 summary step (done) |
| `docs/cursor-prompts/09-baseline-first-enhance.md` | **Create at implementation kickoff** |

---

## 17. Glossary

| Term | Meaning |
|------|---------|
| **Brief** | Structured analysis output of Phase 1 — the resume "fine print" |
| **Baseline** | Form after Phase 2 deterministic transforms |
| **Weave** | JD keyword alignment into existing bullets (not invention) |
| **Atom** | Single JD requirement/keyword unit for coverage tracking |
| **Gap** | Tier-1 atom with no truthful anchor on resume |
| **Soft block** | AI unavailable but baseline still delivered |
| **Hard block** | Enhance cannot run at all |
| **Enhance session meta** | Transient API payload (coverage, gaps, warnings) — may persist on save |
| **JDSkillsFramework** | JD text → ranked posting-specific skills vocabulary |
| **Role Skills (O\*NET)** | Occupation-level skills/tools for resume group ordering |
| **Features Framework** | AI gate resolution — baseline vs Phase 3 |

---

## 18. Locked product decisions (2026-06-27)

### 18.1 AI off = baseline only (all flows)

**Rule:** Any condition that disables AI is treated identically:

- `EASYSUBMIT_AI_GLOBALLY_ENABLED` off
- `enhanceWithAiResumeProfile` feature flag off
- `user.aiSourcePreference === "disabled"`
- No BYOK / pool down / quota exceeded

→ Phase 1 + Phase 2 always run. Phase 3 skipped. Return `success: true` + optional `warning`.

**Code change:** `lib/features/resolve-enhance.ts`

- Remove G2 hard block (`feature_disabled` must not prevent baseline).
- Return `{ baselineAvailable: true, aiAvailable: false, reason }` for all soft blocks.
- `lib/ai/enhance-resume-for-user.ts`: stop early-returning `runDeterministicResumeEnhance` only for global/user disabled — always call `runResumeEnhancePipeline`.

**Only hard blocks:** auth failure, JD validation failure (job flows), unrecoverable baseline throw.

### 18.2 Quota / daily limit — TODO

**Decision:** Quota exceeded = **AI failure** (baseline still delivered + warning). Same UX as pool down.

**Open product question (TODO in `docs/ACTION_ITEMS.md`):**

- Does baseline-only enhance count toward daily enhancement limit?
- Provisional implementation: **do not increment quota** unless `aiSucceeded === true` (matches current AI-only billing intent).

### 18.3 Onboarding (F1) — never AI

**Decision:** Onboarding **never** runs Phase 3 — even if user enables AI globally, has BYOK, and is subscribed.

**Code changes:**

| File | Change |
|------|--------|
| `run-resume-enhance-pipeline.ts` | `allowAiUpgrade: false` when `surface === "onboarding"` OR `variant === "onboarding"` |
| `enhance-resume-for-user.ts` | Map `variant: "onboarding"` → pipeline with `allowAiUpgrade: false` |
| `resolve-enhance.ts` | Keep `AI_DISABLED_SURFACES = ["onboarding"]` — returns `aiAvailable: false` |
| `run-enhance.ts` | Must not be callable from onboarding path (assert in pipeline) |
| `enhanceResumeOnboarding()` | Call `runResumeEnhancePipeline({ allowAiUpgrade: false, hasJd: false })` |
| `checkEnhanceWithAiPreflight({ variant: "onboarding" })` | `baselineAvailable: true`, `aiAvailable: false` always |

**Remove:** any future path that could pass onboarding form to `runResumeEnhance`.

### 18.4 Base Resume Studio (F6) — no JD

**Decision:** When JD is empty, still run full baseline + AI upgrade (if AI available).

- Phase 1: role-only brief (O*NET, bullet quality, summary/skills fine print) — no JD atoms.
- Phase 2: baseline without JD weave.
- Phase 3: AI **single pass** (generate only — skip optimize pass 2).
- Goal: customize resume to **target role** and flesh out weak sections from role vocabulary.

**Code:** `runResumeEnhance` already skips pass 2 when `!ctx.jobDescription` — no change needed beyond baseline-first input.

### 18.5 Skills injection — locked in §19; JD vocabulary from §23 JDSkillsFramework

### 18.6 Coverage / gaps metadata — transient then persist (§20)

### 18.7 Re-enhance uses merged form

When Review/Studio loads `getMergedResumeForJob()`, Phase 1–2 input is **merged form** (base profile + existing job overrides), not raw profile.

---

## 19. Skills injection — locked policy (2026-06-27)

### Limits (not unlimited)

Skills are capped by `lib/resume/skills-rules.ts`:

| Rule | Value |
|------|-------|
| **Hard max** | `SKILLS_HARD_MAX = 20` — never exceed |
| System target | 15–20 on enhance |
| Banned slot-wasters | e.g. "Communication", "Teamwork" — never inject |
| Prose skills | Rejected (>4 words, action verbs) |
| JD Brain filter | Only `MASTER_SKILLS` taxonomy tokens become `mustAddSkills` today — **target:** JDSkillsFramework ranks all JD skills, then filter via `normalizeToMasterSkill()` |

### Locked policy — **Two groups: JD first, then resume (intelligent order)**

Skills are merged as **two logical groups**, then serialized into the single ATS **Skills** section (RULES §3–4: one section, comma/pipe-separated block).

#### Group 1 — **JD skills** (fill first)

Sources (deduped, filtered, ranked):

1. **JDSkillsFramework** `JdSkillsVocabulary.skills` (primary — ESCO/ESCOX + deterministic merge)
2. JD Brain `mustAddSkills` (legacy path until directive consumes vocab)
3. Keyword-gap `skillsToAdd` (taxonomy-backed)
4. Tier-1 JD keywords that pass `isKnownSkillToken()`

**Not in JD group:** O*NET-only terms unless also in JD (O*NET goes to resume group if room).

**Priority:** JDSkillsFramework ranked list first, then mustAddSkills → keyword gap → tier-1, until JD pool exhausted or cap reached.

#### Group 2 — **Resume skills** (fill remaining slots)

Sources:

1. Skills already on the user's resume (parsed from `skillsText` + experience-derived if any)
2. O*NET role skills + tools not already in JD group

**Ordering — intelligent, not random.** Score each candidate resume skill:

| Signal | Weight |
|--------|--------|
| Mentioned in **most recent** experience bullets | High |
| Mentioned in older experience | Medium |
| Mentioned in summary | Medium |
| In O*NET top tools for `targetRole` | Medium |
| Matches JD domain / `summaryTheme` | Low boost |
| Already duplicated in JD group | Exclude |

Sort **descending by score**; tie-break alphabetically.

Fill remaining slots up to `SKILLS_HARD_MAX - jdSkills.length`.

#### Serialization → `skillsText`

Single Skills section for export (Word/PDF/HTML unchanged):

```
{jdSkills.join(", ")} | {resumeSkills.join(", ")}
```

- Use ` | ` (space-pipe-space) **only when both groups non-empty** (allowed per RULES: comma **or** pipe separated).
- If only one group, comma-separated list only (no pipe).
- Total items ≤ 20 across both groups.

**Example:**

```
Tableau, Business Objects, CAPA, Data Analytics | Python, AWS, Kubernetes, Swift, Kotlin, Node.js, CI/CD, PostgreSQL
```

#### Truthfulness split (unchanged)

| Section | Policy |
|---------|--------|
| **Skills** | Max-fill JD group + best resume skills to 20 — user may delete in Refinery |
| **Experience** | No fabrication — weave + gap hints only |

#### AI phase

AI may reorder within groups or refine wording but post-process must:

- Preserve two-group semantics OR flatten while keeping JD terms front-loaded
- Enforce `SKILLS_HARD_MAX`, banned, prose rules (`postProcessSkillsText`)

### Implementation

**File:** `lib/job-tracker/enhance/merge-skills-grouped.ts` (NEW)

```typescript
export type GroupedSkills = {
  jdSkills: string[];
  resumeSkills: string[];
};

export function scoreResumeSkillRelevance(
  skill: string,
  input: {
    form: HubRefineryForm;
    targetRole: string;
    onet: OnetRoleVocabulary;
    jdSkillSet: Set<string>;
    summaryTheme?: string;
  },
): number;

export function buildGroupedSkills(input: {
  existingSkillsText: string;
  jdVocabulary: JdSkillsVocabulary;  // from JDSkillsFramework
  mustAddSkills: string[];
  keywordSkills: string[];
  skillsToRemove: string[];
  form: HubRefineryForm;
  targetRole: string;
  onet: OnetRoleVocabulary;
  summaryTheme?: string;
}): { grouped: GroupedSkills; skillsText: string; skillsAdded: string[]; overflow?: string[] };

export function serializeGroupedSkills(grouped: GroupedSkills): string;
```

Called from `applyBaselineEnhance` — replaces flat `mergeSkills`.

**Brief / UI (optional v1.1):**

- `brief.skills.jdSkills` + `brief.skills.resumeSkills` on `ResumeEnhanceBrief`
- `StudioSkillsField` — two chip groups ("Job-targeted" / "Core") when enhance metadata present

### Cap algorithm (pseudocode)

```typescript
const jd = dedupeFilter(jdCandidates).slice(0, SKILLS_HARD_MAX);
const slotsLeft = SKILLS_HARD_MAX - jd.length;
const resume = sortByRelevanceScore(resumeCandidates)
  .filter(s => !jd.has(s))
  .slice(0, slotsLeft);
return serialize({ jd, resume });
```

---

## 20. Enhance session meta — transient vs persisted

`JobResumeTailor` today has no metadata column — only `overrides`, `changedSections`, `enhanceTraceId`.

### Two-layer model (recommended)

**Layer 1 — Transient (every enhance response)**

Always returned on `EnhanceRunResult` — no DB required:

```typescript
type EnhanceSessionMeta = {
  traceId: string;
  engineMode: "ai" | "deterministic";
  aiAttempted: boolean;
  aiSucceeded: boolean;
  warning?: string;
  aiBlockCode?: string;
  enhanceSummary: string;
  coverageBefore?: JdCoverageReport;
  coverageAfter?: JdCoverageReport;
  skillsGaps?: string[];
  readinessDelta?: { before: number; after: number };
};
```

**Consumers:**

| Flow | Uses transient meta |
|------|---------------------|
| F3 Review | Show coverage panel immediately |
| F4 Extension | Warning pill + optional gaps toast |
| F5/F6 Studio | Hold in React state until user saves |
| F2 Pipeline | Log + pass to persist layer |

**Layer 2 — Persisted (auto-save flows only)**

Add `enhanceMeta Json?` to `JobResumeTailor` (migration).

Written in `persistEnhancedResume()` when F2/F3/F4 save — **slim snapshot**:

```typescript
type PersistedEnhanceMeta = Pick<
  EnhanceSessionMeta,
  "traceId" | "engineMode" | "aiBlockCode" | "coverageAfter" | "readinessDelta" | "enhanceSummary"
> & { persistedAt: string };
```

**Studio (F5/F6):** No persist at enhance time. On `saveJobResumeStudio()` / `saveResumeProfileStudio()`, optionally attach latest session meta if client sends it (optional body field `enhanceSessionMeta`) — **phase 2** if not needed for v1.

### Gap UX (#7 locked)

- **Always save** enhanced form when pipeline succeeds (including large gap count).
- **No modal block** before save.
- **Amber banner** when `coverageAfter.coveragePercent < 85` or `skillsGaps.length > 0`.
- **EnhanceCoveragePanel** lists gaps with copy: *"Add only if accurate for your experience."*
- Re-enhance replaces prior `enhanceMeta` on persist.

---

## 21. Onboarding code change checklist

```
enhanceResumeOnboarding()
  └─ runResumeEnhancePipeline({ allowAiUpgrade: false, surface: "onboarding" })

runResumeEnhancePipeline()
  if (surface === "onboarding" || input.allowAiUpgrade === false) skip Phase 3

resolveEnhanceFeature(onboarding)
  → { baselineAvailable: true, aiAvailable: false, reason: "user_disabled" }

enhanceResumeForUserId(variant: "onboarding")
  → should not be used for onboarding; keep enhanceResumeOnboarding separate
```

Fix `enhanceResumeOnboarding` return type: `skillsAdded` should come from `baseline.changes.skillsAdded`, not `changedSections`.

---

## 22. Extension API response shape (additive)

```typescript
// POST /api/extension/jobs/:id/enhance  kind=resume
{
  success: true,
  engineMode: "ai" | "deterministic",
  warning?: string,
  aiBlockCode?: string,
  enhanceSummary?: string,
  coverageAfter?: { coveragePercent: number; gaps: Array<{ label: string }> },
  atsDelta?: { before: number; after: number }
}
```

Extension client: treat `success: true` + `warning` as success (amber), not failure.

---

## 23. JD Skills Framework (JDSkillsFramework)

**Purpose:** Extract and normalize **posting-specific** skills from JD text — the O\*NET counterpart for job descriptions, not occupations.

**Module root:** `lib/job-tracker/jd/jd-skills-service.ts`

### 23.1 Public API

```typescript
// lib/job-tracker/jd/jd-skills-types.ts

export type JdSkillEntry = {
  label: string;
  normalized?: string;
  source: "deterministic" | "esco" | "escox" | "keyword_gap";
  confidence: number;
  tier?: 1 | 2 | 3;
  escoUri?: string;
};

export type JdSkillsVocabulary = {
  skills: JdSkillEntry[];
  occupationHint?: string;
  descriptionHash: string;
  source: "api" | "cache" | "fallback";
  providersUsed: Array<"deterministic" | "esco" | "escox">;
};

export async function fetchJdSkillsVocabulary(
  input: FetchJdSkillsInput,
): Promise<JdSkillsVocabulary>;
```

**Contract:** Never throws. On total failure → `{ skills: [], source: "fallback", providersUsed: ["deterministic"] }`.

### 23.2 Provider chain

1. Cache hit (`jobTrackerEntry.jdSkillsVocabulary` + hash match)
2. Deterministic (always) — `keyword-extract` + `jd-extractor`
3. ESCO REST normalize (optional, free)
4. ESCOX sidecar (optional, feature-flagged)

| Provider | File | Cost |
|----------|------|------|
| Deterministic | `jd-skills-deterministic.ts` | Free |
| ESCO search | `jd-skills-esco.ts` | Free |
| ESCOX | `jd-skills-escox.ts` | Free (self-host) |

**Not v1:** Lightcast (50/mo), Textkernel (paid).

### 23.3 Cache + persistence

Process memory (1 hr) + `JobTrackerEntry.jdSkillsVocabulary Json?`, `jdSkillsHash String?`.

### 23.4 Integration

| Consumer | Uses vocab for |
|----------|----------------|
| `buildResumeEnhanceDirective` | `mustAddSkills` |
| `buildGroupedSkills` | Skills Group 1 |
| `buildJdAtomList` | Tier-1 atoms |
| `buildJdCoverageReport` | Coverage matching |

### 23.5 Interim wiring (Wave A)

Before full pipeline exists, call `fetchJdSkillsVocabulary` from `buildEnhanceIntelligenceContext` and pass ranked skills into `buildResumeEnhanceDirective` — immediate skills quality win.

---

## 24. Work inventory — shipped vs target

**Audit:** 2026-06-27. North-star pipeline **not implemented**.

### 24.1 Shipped (reuse in pipeline)

| Area | Status |
|------|--------|
| JD Brain (`lib/job-tracker/jd/*`) | ✅ |
| O\*NET `fetchRoleVocabulary` | ✅ |
| `enhance-plan` + `apply-enhance-plan` (flat skills) | ✅ |
| `build-deterministic-summary`, bullet rules, mashed split | ✅ |
| `enhance-resume-for-user` + `run-enhance` + fallback | ✅ needs refactor |
| `resolve-enhance` hard blocks on quota | ✅ needs soft block |

### 24.2 Not started

| Item | Wave |
|------|------|
| JDSkillsFramework (`jd-skills-service.ts` + providers) | **A** |
| `run-resume-enhance-pipeline.ts` + brief/baseline modules | **B** |
| `merge-skills-grouped.ts`, JD weave, coverage UI | **B** |
| `enhanceMeta` persist, soft gate UX | **B** |

### 24.3 Behavior gaps

| Today | Target |
|-------|--------|
| Quota/no-key → hard error | Baseline + warning |
| Raw form → AI | Baseline form + brief |
| Flat skills merge | JD \| resume groups, max 20 |
| MASTER_SKILLS-only JD skills | JDSkillsFramework |
| No JD bullet weave | Phase 2 weave |
| Tailor fails on AI error | Baseline persisted |

### 24.4 Implementation status (2026-06-27)

| Wave | Status |
|------|--------|
| **A** JDSkillsFramework | ✅ Shipped |
| **B** 3-phase pipeline | ✅ Shipped |
| **C** Tests + analytics + UI | ✅ Shipped (studio/extension warning UX wired; ESCOX optional off) |

**Migration required:** `jdSkillsVocabulary`, `jdSkillsHash` on `job_tracker_entries`; `enhanceMeta` on `job_resume_tailors` — run `npx prisma migrate dev` locally.
