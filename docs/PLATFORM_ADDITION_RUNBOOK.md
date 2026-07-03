# Adding a New ATS Platform

This runbook walks through adding full support for a new ATS platform to EasySubmit.

## Prerequisites

- URL pattern(s) for the platform
- Understanding of how the platform shortlists candidates (keyword search, AI matching, structured parsing, or human review)
- Example URLs for test coverage

## Steps

### 1. Update type definitions in `src/shared/ats-platform-detection.ts`

Add the platform to the `AtsPlatform` union:

```typescript
export type AtsPlatform =
  | "workday"
  | "greenhouse"
  // ... existing platforms ...
  | "your_platform"  // Add here
  | "unknown";
```

Add to `KNOWN_ATS_PLATFORMS` constant:

```typescript
export const KNOWN_ATS_PLATFORMS = [
  // ... existing ...
  "your_platform",
] as const satisfies readonly Exclude<AtsPlatform, "unknown">[];
```

### 2. Add URL detection patterns

In `src/shared/ats-platform-detection.ts`, add to `ATS_URL_PATTERNS` (ordered most-specific first):

```typescript
export const ATS_URL_PATTERNS: readonly AtsUrlPattern[] = [
  // ... existing patterns ...
  { pattern: /yourdomain\.com|recruiting\.yourdomain\.com/i, platform: "your_platform" },
];
```

**Guidelines:**
- Use case-insensitive regex (`/i` flag)
- Match domain AND candidate experience URL paths when possible
- Put more specific patterns before wildcards

### 3. Add name aliases

In `ATS_PLATFORM_NAME_ALIASES`:

```typescript
export const ATS_PLATFORM_NAME_ALIASES: Record<string, KnownAtsPlatform> = {
  // ... existing ...
  your_platform: "your_platform",
  yourplatform: "your_platform",       // no spaces
  "your platform": "your_platform",    // with spaces
  yp: "your_platform",                 // abbreviation if common
};
```

### 4. Add platform rules

In `lib/job-tracker/ats/platform-rules.ts`, add to `PLATFORM_RULES`:

```typescript
const PLATFORM_RULES: Record<AtsPlatform, PlatformRule> = {
  // ... existing ...
  your_platform: {
    label: "Your Platform",
    preferredFormat: "word" or "pdf" or "either",
    exactKeywordMatch: true or false,   // legacy systems = true, modern = false
    sectionTitleSensitive: true or false,
    skillsSectionWeighted: true or false,
    strictDates: true or false,
    strategy: "keyword_search" | "ai_match" | "parse_first" | "human_review",
    tip: "Actionable user-facing tip about how to optimize for this platform.",
  },
};
```

**Strategy selection:**
- `keyword_search` — legacy/boolean search (Taleo, Jobvite, ADP, Paycom, Paylocity)
- `ai_match` — AI/ML ranking (iCIMS, SmartRecruiters, SuccessFactors, Ashby, Workable, LinkedIn, Indeed)
- `parse_first` — structured field extraction first (Workday)
- `human_review` — direct human reading, no algorithms (Greenhouse, Lever, BambooHR)

**Tip writing:**
- Start with platform name
- Mention the shortlisting mechanism (how it ranks/filters)
- Give 1–2 actionable resume-optimization guidelines
- Keep under 150 characters

Example:
```
"iCIMS Role Fit scores algorithmically — align skills to the JD taxonomy, state required years and certifications plainly, and match JD terminology in summary and bullets."
```

### 5. Add test coverage

In `lib/job-tracker/ats/platform-rules.test.ts`, add to the `urlCases` array:

```typescript
const urlCases: Array<{ url: string; platform: (typeof KNOWN_ATS_PLATFORMS)[number] }> = [
  // ... existing ...
  { url: "https://recruiting.your-platform.com/jobs/123", platform: "your_platform" },
  { url: "https://company.yourdomain.com/careers/job/456", platform: "your_platform" },
];
```

### 6. Verify completeness

Run tests to ensure no gaps:

```bash
npx vitest run --config config/vitest.config.ts lib/job-tracker/ats/platform-rules.test.ts
```

Tests should verify:
- ✅ Platform is in `KNOWN_ATS_PLATFORMS`
- ✅ Platform has at least one URL pattern
- ✅ Platform has a `PLATFORM_RULES` entry with `strategy`
- ✅ All aliases resolve correctly
- ✅ Test URLs detect the correct platform

### 7. Update documentation

**In `docs/enhance-pipeline-design.md`:**
- Add platform to the strategy table if introducing a new strategy type

**In `docs/ARCHITECTURE.md`:**
- Add changelog row: `| YYYY-MM-DD | **Platform addition: Your Platform** — added with [strategy] strategy; URL pattern for yourdomain.com |`

**In `docs/PROJECT_STATE.md`:**
- If user-facing change (new ATS supported), add a product release note

### 8. Type check and test

```bash
npx tsc --noEmit
npm run test -- platform-rules
```

All tests should pass, no type errors.

## Example: Adding "Lever" (already implemented, reference only)

```typescript
// 1. Add to AtsPlatform union
export type AtsPlatform = "workday" | "greenhouse" | "lever" | "unknown";

// 2. Add to KNOWN_ATS_PLATFORMS
"lever",

// 3. Add URL pattern
{ pattern: /jobs\.lever\.co|lever\.co/i, platform: "lever" },

// 4. Add aliases
lever: "lever",

// 5. Add rules
lever: {
  label: "Lever",
  preferredFormat: "either",
  exactKeywordMatch: false,
  sectionTitleSensitive: false,
  skillsSectionWeighted: false,
  strictDates: false,
  strategy: "human_review",
  tip: "Lever relies on human review — focus on clear achievement bullets with measurable impact and a concise summary aligned to the role.",
},

// 6. Add test case
{ url: "https://jobs.lever.co/acme/abc", platform: "lever" },
```

## Common questions

**Q: How do I know if a platform uses keyword_search vs. ai_match?**

A: Research the platform's candidate filtering UI and documentation:
- Keyword search: recruiters enter search queries ("Python AND AWS"), system returns boolean matches
- AI match: system shows a match percentage or score, often learns from recruiter feedback
- Parse first: candidate fields are parsed into structured data (title, dates, skills), recruiters filter by structured fields
- Human review: only humans see/score resumes, no algorithmic ranking

**Q: What if the platform has multiple domain names?**

A: Add multiple patterns to `ATS_URL_PATTERNS`. Put the most specific first. Example:

```typescript
{ pattern: /recruiting\.mycompany\.com/i, platform: "my_platform" },
{ pattern: /mycompany\.com\/careers/i, platform: "my_platform" },
```

**Q: Should I add site adapter support at the same time?**

A: Site adapters (form field scraping for autofill) are a separate layer. You can add platform detection now and defer site adapter implementation to a follow-up task. Autofill tests live in `lib/extension/site-adapters.test.ts`.

**Q: How do I know which fields to set for rules?**

A: Use research + heuristics:
- `exactKeywordMatch` — true for Taleo, ADP, legacy systems; false for modern, AI-driven platforms
- `sectionTitleSensitive` — true if the platform provides standard section names in docs; false for flexible/custom
- `skillsSectionWeighted` — true if the platform emphasizes skills in candidate ranking docs
- `strictDates` — true for legacy systems with parser constraints; false for modern platforms
- `strategy` — research how the platform shortlists (see Q1 above)

## Validation checklist

Before considering the platform "done":

- [ ] Platform is in `AtsPlatform` union
- [ ] Platform is in `KNOWN_ATS_PLATFORMS`
- [ ] URL pattern(s) added and tested
- [ ] Name aliases added
- [ ] `PLATFORM_RULES` entry complete with all fields
- [ ] Test case(s) added for URL detection
- [ ] Completeness test passes (every platform has rules + strategy)
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] All tests pass (`npm run test -- platform`)
- [ ] Docs updated (enhance-pipeline-design.md, ARCHITECTURE.md)
- [ ] Commit message mentions platform + strategy

## Commit template

```
feat(ats): add [Platform Name] support with [strategy] strategy

Add [Platform Name] detection (yourdomain.com), rules, and [strategy]-based
strategy instructions. Update enhance brief and ATS panel to surface
platform-specific tips. Tests: URL detection, rules completeness.

Co-authored-by: [Author] <email@example.com>
```
