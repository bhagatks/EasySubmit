# JD Brain — Architecture Design

> Status: **Implemented** (2026-06-22)
> Last updated: 2026-06-22

---

## Overview

5-layer pipeline that transforms a raw job description into a structured `ResumeEnhanceDirective` — feeding the resume engine with precise instructions instead of a raw keyword dump.

```
Raw JD
  │
  ▼
Layer 1: JD Cleaner          strip EEO, benefits, boilerplate, normalize encoding
  │
  ▼
Layer 2: JD Segmenter        JSON-LD fields → header patterns → heuristics → weighted sections
  │
  ├──▶ Layer 3A: Deterministic Extractor   always runs, zero cost (~5ms)
  │                                         seniority, scope, domain, years, taxonomy skills, tiered keywords
  │
  └──▶ Layer 3B: AI Extractor (async)      Gemini Flash, system key only, cached by hash
                                            intent, deliverables, success metrics, culture signals
  │
  ▼
Layer 4: JD Intelligence     merged JDIntelligence type, stored in DB (jdIntelligence JSON column)
  │
  ▼
Layer 5: Resume Enhance Directive    structured instructions fed to resume engine
```

---

## File Structure

### New: `lib/job-tracker/jd/`

| File | Layer | Mode |
|---|---|---|
| `jd-cleaner.ts` | 1 | sync |
| `jd-segmenter.ts` | 2 | sync |
| `jd-extractor.ts` | 3A | sync · deterministic |
| `jd-ai-extractor.ts` | 3B | async · Gemini Flash |
| `jd-intelligence.ts` | 4 | types + merge logic |
| `jd-directive.ts` | 5 | intelligence → directive |
| `jd-brain.ts` | Public API | sync + async variants |
| `jd-brain.test.ts` | Tests | ≥ 20 tests |
| `index.ts` | Re-exports | — |

### Modified

| File | Change |
|---|---|
| `src/shared/extension/scrape-helpers.ts` | Extract JSON-LD `qualifications`, `responsibilities`, `incentives` fields |
| `src/shared/extension/types.ts` | Add `jsonLdFields` to `ScrapedJobMetadata` |
| `lib/job-tracker/ats/keyword-gap.ts` | Add `analyzeKeywordGapFromIntelligence` with tiered weighted scoring |
| `lib/job-tracker/ats/job-intelligence.ts` | Accept `JDIntelligence` instead of raw JD string |
| `lib/job-tracker/ats/resume-readiness-score.ts` | Use tier-weighted coverage for keyword pillar |
| `src/lib/ai/engine/brain.ts` | Replace `buildIntelligenceBlock` with `buildDirectiveBlock` |
| `lib/ai/enhance-resume-for-user.ts` | Load/cache `jdIntelligence` from DB; use directive |
| `app/actions/job-tracker.ts` | Persist `jdIntelligence` + hash on job save |
| `app/actions/review-documents.ts` | Use cached intelligence in enhance flow |
| `prisma/schema.prisma` | 3 new nullable columns on `jobTrackerEntry` |

---

## Database Schema

```prisma
// On model JobTrackerEntry — 3 new nullable columns
jdIntelligence     Json?      // Cached JDIntelligence object
jdIntelUpdatedAt   DateTime?  // When intelligence was last computed
jdDescriptionHash  String?    // SHA1 truncated to 16 chars for cache invalidation
```

**Cache invalidation:**
- Hash = `sha1(description.trim().toLowerCase()).slice(0, 16)`
- On enhance: if stored hash === current hash → use cached `jdIntelligence`
- On hash mismatch or no cache → re-run extraction, update all 3 columns
- Deterministic layer always runs fresh (~5ms, no DB write needed per-enhance)
- AI result cached indefinitely until description changes

---

## Complete Type Definitions

```typescript
// lib/job-tracker/jd/jd-intelligence.ts

export type JDSeniority =
  | "entry" | "mid" | "senior" | "staff" | "principal"
  | "lead" | "manager" | "director" | "vp" | "exec";

export type JDScope = "ic" | "manager" | "lead" | "hybrid";

export type JDDomain =
  | "software-engineering" | "frontend" | "backend" | "fullstack"
  | "devops-sre" | "data-engineering" | "ml-ai" | "security"
  | "product-management" | "mobile" | "data-science" | "qa-testing" | "other";

export type JDImpactDimension =
  | "reliability" | "scale" | "speed" | "cost"
  | "revenue" | "quality" | "security" | "team" | "delivery";

export type JDSegments = {
  requirements:     string;
  responsibilities: string;
  preferred:        string;
  context:          string;
  source: "json-ld" | "header" | "heuristic" | "full-text";
  wordCount: { requirements: number; responsibilities: number; preferred: number };
};

export type JDIntelligence = {
  // Hard requirements (from requirements section)
  mustHaveSkills:    string[];
  mustHaveYearsExp:  number | null;
  mustHaveDegree:    string | null;
  mustHaveCerts:     string[];

  // Preferred
  preferredSkills:   string[];
  preferredDomain:   string[];

  // Role classification
  seniority:         JDSeniority;
  scope:             JDScope;
  domain:            JDDomain;
  industryDomain:    string[];

  // Tiered keywords (weighted gap analysis)
  tier1Keywords:     string[];  // from requirements  — weight ×3
  tier2Keywords:     string[];  // from responsibilities — weight ×2
  tier3Keywords:     string[];  // from preferred — weight ×1

  // Resume directive signals
  summaryTheme:      string;    // "Lead with X" — one sentence
  targetVerbs:       string[];
  deliverables:      string[];
  impactDimensions:  JDImpactDimension[];
  emphasisAreas:     string[];
  deprioritize:      string[];

  // Culture signals (AI only — null if deterministic only)
  velocitySignal:    "fast" | "moderate" | "structured" | null;
  ownershipLevel:    "high" | "medium" | "low" | null;

  // Meta
  source:            "deterministic" | "ai" | "hybrid";
  confidence:        number;     // 0–1
  extractedAt:       string;     // ISO timestamp
};

export type ResumeEnhanceDirective = {
  mustAddSkills:      string[];
  mustWeaveKeywords:  string[];   // tier1 + tier2 not already in resume
  roleLevel:          JDSeniority;
  scope:              JDScope;
  targetVerbs:        string[];
  impactDimensions:   JDImpactDimension[];
  quantHints:         string[];   // e.g. "reduce incidents", "improve p99 latency"
  summaryTheme:       string;
  emphasisAreas:      string[];
  deprioritize:       string[];
  cultureSignals: {
    velocity:  "fast" | "moderate" | "structured" | null;
    ownership: "high" | "medium" | "low" | null;
    industry:  string[];
  };
};
```

---

## Function Signatures

### jd-cleaner.ts
```typescript
export type JDCleanResult = {
  cleaned:         string;
  wordCount:       number;
  likelyTruncated: boolean;
  strippedTypes:   string[];
};

export function cleanJobDescription(raw: string): JDCleanResult;
```

### jd-segmenter.ts
```typescript
export type JSONLDJobFields = {
  qualifications?:   string;
  responsibilities?: string;
  incentives?:       string;
};

export function segmentJobDescription(
  cleaned: string,
  jsonLdFields?: JSONLDJobFields,
): JDSegments;
```

### jd-extractor.ts (deterministic)
```typescript
export function extractJDIntelligenceSync(
  segments: JDSegments,
  targetRole: string,
): JDIntelligence;

// Exported for testing:
export function detectSeniority(title: string, requirements: string): JDSeniority;
export function detectScope(title: string, responsibilities: string): JDScope;
export function detectDomain(title: string, skills: string[]): JDDomain;
export function extractYearsExp(requirements: string): number | null;
export function extractTieredKeywords(
  segments: JDSegments,
): { tier1: string[]; tier2: string[]; tier3: string[] };
```

### jd-ai-extractor.ts
```typescript
export type JDAiExtractResult =
  | { ok: true;  intelligence: JDIntelligence }
  | { ok: false; reason: "unavailable" | "parse_error" | "quota" };

export async function extractJDIntelligenceWithAI(
  segments: JDSegments,
  targetRole: string,
  base: JDIntelligence,   // deterministic result to enrich
): Promise<JDAiExtractResult>;

export function buildJDExtractionPrompt(segments: JDSegments, targetRole: string): string;
export function mergeAIIntoIntelligence(
  base: JDIntelligence,
  aiResult: Partial<JDIntelligence>,
): JDIntelligence;
```

### jd-directive.ts
```typescript
export function buildResumeEnhanceDirective(
  intelligence: JDIntelligence,
  currentSkills: string[],  // skills already in resume — compute gap
): ResumeEnhanceDirective;
```

### jd-brain.ts (public API)
```typescript
export type JDAnalysisInput = {
  rawDescription:      string;
  targetRole:          string;
  jsonLdFields?:       JSONLDJobFields;
  cachedIntelligence?: JDIntelligence | null;
  cachedHash?:         string | null;
  useAi?:              boolean;  // default true
};

export type JDAnalysisResult = {
  segments:        JDSegments;
  intelligence:    JDIntelligence;
  cacheHit:        boolean;
  descriptionHash: string;
};

// Main entry point (async — runs AI enrichment if no cache)
export async function analyzeJobDescription(input: JDAnalysisInput): Promise<JDAnalysisResult>;

// Sync-only (deterministic floor — for ATS scoring, never blocks on AI)
export function analyzeJobDescriptionSync(
  rawDescription: string,
  targetRole: string,
  jsonLdFields?: JSONLDJobFields,
): JDAnalysisResult;

// Cache invalidation helper
export function hashJobDescription(description: string): string;
```

---

## AI Extraction

### Model
- **Gemini Flash** via system key pool (NOT user quota)
- Gate: `isSystemAiEnabled(aiEngine)` — if off, skip AI, return deterministic only
- Temperature: `0` (deterministic JSON extraction)
- Max input: requirements (3000 chars) + responsibilities (2000 chars)
- Max output: 1000 tokens
- Cost: ~$0.0001/job — negligible; cached indefinitely per unique JD

### System Prompt
```
You are an expert technical recruiter and resume strategist. Extract structured job intelligence from the provided sections. Return ONLY valid JSON — no markdown, no commentary. Never invent facts not present in the text.
```

### User Prompt Template
```
Target role: {{targetRole}}

REQUIREMENTS:
"""
{{segments.requirements.slice(0, 3000)}}
"""

RESPONSIBILITIES:
"""
{{segments.responsibilities.slice(0, 2000)}}
"""

{{if preferred}}PREFERRED:
"""
{{segments.preferred.slice(0, 1000)}}
"""{{/if}}

Return JSON:
{
  "mustHaveSkills": [],
  "preferredSkills": [],
  "mustHaveYearsExp": null,
  "mustHaveDegree": null,
  "mustHaveCerts": [],
  "summaryTheme": "",
  "targetVerbs": [],
  "deliverables": [],
  "impactDimensions": [],
  "emphasisAreas": [],
  "deprioritize": [],
  "velocitySignal": null,
  "ownershipLevel": null,
  "industryDomain": [],
  "preferredDomain": []
}
```

---

## Keyword Gap — Tiered Weighted Scoring

```typescript
// New API (preferred)
export function analyzeKeywordGapFromIntelligence(
  data: PrimeResumeData,
  intel: JDIntelligence,
): KeywordGapResult;

// Weighted coverage formula
// tier1 = requirements keywords (weight ×3)
// tier2 = responsibilities keywords (weight ×2)
// tier3 = preferred keywords (weight ×1)
const weightedMatched = matched1 * 3 + matched2 * 2 + matched3 * 1;
const weightedTotal   = total1   * 3 + total2   * 2 + total3   * 1;
const coveragePercent = Math.round((weightedMatched / weightedTotal) * 100);

// KeywordMatch gets a tier field:
export type KeywordMatch = {
  keyword: string;
  foundIn: ("skills" | "experience" | "summary" | "education" | "other")[];
  tier:    1 | 2 | 3;  // NEW
};

// Backward-compat wrapper — old signature still works
export function analyzeKeywordGap(
  data: PrimeResumeData,
  targetRole: string,
  jobDescription: string,  // runs analyzeJobDescriptionSync internally
): KeywordGapResult;
```

**Impact:** A resume that covers all tier-1 (requirements) keywords but misses tier-3 (preferred) keywords scores high — which is correct. Old flat counting treated all keywords equally.

---

## brain.ts Directive Prompt Block

Replaces the current `MISSING SKILLS / MISSING KEYWORDS / WEAK BULLETS` block with structured instructions the AI just executes — no re-derivation:

```
PRE-COMPUTED JD ANALYSIS — act on these exactly, do not re-derive:

ROLE CONTEXT: {{roleLevel}} · {{scope}} · emphasis: {{emphasisAreas.join(", ")}}

SKILLS — add ALL of these to the Skills section (truthful only):
  {{mustAddSkills.join(", ")}}

KEYWORDS — weave into bullets and summary where supported:
  {{mustWeaveKeywords.join(", ")}}

SUMMARY — must lead with this theme:
  "{{summaryTheme}}"

BULLET REWRITES — use these verbs: {{targetVerbs.slice(0,8).join(", ")}}
QUANTIFY AGAINST: {{impactDimensions.join(", ")}}

{{deprioritize.length > 0 ? "SUPPRESS / DOWNPLAY: " + deprioritize.join(", ") : ""}}
```

---

## Integration Flow

### On Job Save
1. Scraper sends `jsonLdFields` (new field in `ScrapedJobMetadata`)
2. Hash description → store on `jobTrackerEntry`
3. Run `analyzeJobDescriptionSync` (deterministic, ~5ms)
4. Persist deterministic `jdIntelligence` + hash to DB
5. Queue AI enrichment async (non-blocking — user sees job saved immediately)

### On Enhance with AI
1. Load job + `cachedHash` + `cachedIntelligence` from DB
2. Hash current description
3. Cache hit → use cached `jdIntelligence` (no extraction)
4. Cache miss → run `analyzeJobDescription` (deterministic + AI)
5. `buildResumeEnhanceDirective(intelligence, currentResumeSkills)`
6. Pass directive to `brain.ts` Pass 2 via `buildDirectiveBlock`
7. Write updated intel to DB if refreshed

### On ATS Score Compute
1. Load `cachedIntelligence` from DB
2. If present → `analyzeKeywordGapFromIntelligence` (tiered weighted)
3. If absent → `analyzeJobDescriptionSync` inline
4. **No AI call in score path** — always fast, always sync

---

## Error Boundaries (all guaranteed)

| Layer | Failure | Fallback |
|---|---|---|
| Cleaner | throws | return raw text unchanged |
| Segmenter | throws | full text treated as requirements section |
| Deterministic extractor | throws | safe defaults (empty arrays, "mid", "other") |
| AI extractor | any error | return deterministic result, `source: "deterministic"` |
| AI JSON parse | invalid JSON | same as AI failure |
| DB cache write | fails | log only, non-blocking — enhance still completes |
| Hash mismatch + AI quota exhausted | — | rerun deterministic, skip AI |

**Guarantee:** `analyzeJobDescription` and `analyzeJobDescriptionSync` NEVER throw. They always return a fully-typed `JDAnalysisResult` — every consumer can trust the result is never null, never partial.

---

## Test Coverage Plan (`jd-brain.test.ts` ≥ 20 tests)

1. Cleaner strips EEO boilerplate correctly
2. Cleaner strips Benefits/Compensation section
3. Cleaner detects truncated JD (< 100 words)
4. Segmenter uses JSON-LD fields when present (`source: "json-ld"`)
5. Segmenter detects "Requirements" header variants
6. Segmenter detects "Responsibilities" header variants
7. Segmenter falls back to heuristic on headerless JD (`source: "heuristic"`)
8. Segmenter source field is correct for each path
9. Extractor detects "Senior" seniority from title
10. Extractor detects "Director" seniority from title
11. Extractor detects manager scope ("manage a team of X")
12. Extractor detects IC scope (no reports language)
13. `extractYearsExp` returns 5 for "5+ years of experience"
14. `extractYearsExp` returns null when no years mentioned
15. Tier-1 keywords come from requirements section only
16. Tier-2 keywords come from responsibilities section only
17. Tier-3 keywords come from preferred section only
18. Weighted coverage > flat coverage for tier-1-heavy match
19. `analyzeJobDescriptionSync` never throws on empty string input
20. `analyzeJobDescription` returns `cacheHit: true` when hash matches
21. Directive `deprioritize` populated from intelligence
22. Directive `mustAddSkills` gap-computes against provided currentSkills

---

## What Does NOT Change

- `JobIntelligence` type (resume vs JD gap analysis) — untouched
- `deterministic-enhancer.ts` — untouched
- `onet-service.ts` — untouched
- `platform-rules.ts` — untouched
- ATS score pillar structure (4 pillars, 25pts each) — untouched
- All existing test files — untouched
- DB migration is additive only (3 nullable columns, zero downtime)

---

## Implementation Order

Once approved:

1. `prisma/schema.prisma` — 3 new nullable columns + `prisma migrate dev`
2. `lib/job-tracker/jd/jd-intelligence.ts` — types first (everything depends on these)
3. `lib/job-tracker/jd/jd-cleaner.ts`
4. `lib/job-tracker/jd/jd-segmenter.ts`
5. `lib/job-tracker/jd/jd-extractor.ts`
6. `lib/job-tracker/jd/jd-ai-extractor.ts`
7. `lib/job-tracker/jd/jd-directive.ts`
8. `lib/job-tracker/jd/jd-brain.ts` + `index.ts`
9. `lib/job-tracker/jd/jd-brain.test.ts`
10. Wire: `keyword-gap.ts` tiered API
11. Wire: `job-intelligence.ts` accepts `JDIntelligence`
12. Wire: `brain.ts` directive block
13. Wire: `enhance-resume-for-user.ts` cache load/write
14. Wire: `job-tracker.ts` action (persist on save)
15. Wire: `review-documents.ts` (use cached intel)
16. Wire: `scrape-helpers.ts` + `types.ts` (JSON-LD fields)
