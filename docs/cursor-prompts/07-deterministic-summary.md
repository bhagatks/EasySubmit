# Cursor Prompt 07 — Template-Based Summary Rewrite for AI-Off Path

## Status

**✅ COMPLETED — 2026-06-26**

---

## Context

When AI is off (`aiSourcePreference = "disabled"` or global kill switch active), the
deterministic enhance path (`applyEnhancePlan`) currently flags the summary but never
rewrites it. This means most users — AI is off by default — end up with a stale or
weak summary permanently.

This prompt adds a template-based summary rewrite to the deterministic path using only
data already in the resume. Zero LLM, zero hallucination. Only rewrites when the existing
summary fails `validateSummary()`.

**This is the PRIMARY enhance path for most users.**

---

## Step 1 — Build the summary template engine

### New file: `lib/job-tracker/enhance/build-deterministic-summary.ts`

```ts
import { validateSummary, SUMMARY_BANNED_WORDS } from "@/lib/resume/summary-rules";
import { isBannedSkill } from "@/lib/resume/skills-rules";

export type DeterministicSummaryInput = {
  currentSummary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    bullets: string[];
    startYear?: string;
    endYear?: string;
  }>;
  targetRole: string;
  summaryTheme?: string;
  roleLevel?: string;
  domain?: string;
};
```

### Logic inside `buildDeterministicSummary(input): string`

**Rule 1 — If current summary already passes validation, return it unchanged:**
```ts
const validation = validateSummary(input.currentSummary);
if (!validation.sentenceError && !validation.wordError && validation.bannedWords.length === 0) {
  return input.currentSummary;
}
```

**Rule 2 — Build 4-sentence template from resume data:**

- **Sentence 1** — Identity:
  `"{targetRole} with {yearsExp} years of experience in {domain}."`
  - If no domain → use the top non-banned skill area
  - If no yearsExp → `"{targetRole} with experience in {domain}."`

- **Sentence 2** — Method:
  `"Applies {skill1}, {skill2}, and {skill3} to {summaryTheme}."`
  - Pick top 3 skills that are NOT `isBannedSkill()`
  - If no summaryTheme → use `"deliver measurable business outcomes"`

- **Sentence 3** — Specialization:
  `"Consistent contributor across {skill4} and {skill5} initiatives at the {roleLevel} level."`
  - If no roleLevel → omit `"at the {roleLevel} level"`
  - If fewer than 5 non-banned skills → reuse skill1/skill2 with different phrasing

- **Sentence 4** — Impact (from experience):
  - Find the strongest bullet from the most recent experience entry:
    - Prefer bullets containing a number or `%` (metric bullet)
    - Fallback to the first non-empty bullet
  - Trim to one sentence (truncate at first `.` or `!` or `?` after 40 chars)
  - Ensure it ends with a period

**Rule 3 — Word count correction:**
- Run `countSummaryWords()` on assembled result
- Under 70 words → expand sentence 2 with an additional skill or phrase like `"and related technologies"`
- Over 80 words → trim sentence 4 to 10 words maximum: `"{First 10 words of bullet}."`

**Rule 4 — Strip any banned words that crept in:**
- For each word in `SUMMARY_BANNED_WORDS`, replace occurrences with a neutral alternative
- "Proven track record" → "Consistent record"
- "Leverage" → "Apply"
- "Passionate" → (remove the clause entirely)

### `deriveYearsOfExperience` utility (same file):

```ts
export function deriveYearsOfExperience(
  experience: Array<{ startYear?: string; endYear?: string }>
): number | undefined {
  const years = experience
    .map((e) => parseInt(e.startYear ?? "", 10))
    .filter((y) => !isNaN(y) && y > 1970 && y <= new Date().getFullYear());

  if (years.length === 0) return undefined;
  const earliest = Math.min(...years);
  const total = new Date().getFullYear() - earliest;
  return Math.min(total, 20);
}
```

---

## Step 2 — Wire into `apply-enhance-plan.ts`

File: `lib/job-tracker/enhance/apply-enhance-plan.ts`

Import:
```ts
import { buildDeterministicSummary, deriveYearsOfExperience } from "./build-deterministic-summary";
```

Find the section where the output resume is assembled (currently comment says
"summary is flagged, never rewritten"). Replace with:

```ts
const yearsOfExperience = deriveYearsOfExperience(form.experience ?? []);

const rewrittenSummary = buildDeterministicSummary({
  currentSummary: form.professionalSummary ?? "",
  skills: mergedSkills,
  experience: form.experience ?? [],
  targetRole: plan.targetRole ?? "",
  summaryTheme: plan.enhanceDirective?.summaryTheme,
  roleLevel: plan.enhanceDirective?.roleLevel,
  domain: plan.enhanceDirective?.domain,
  yearsOfExperience,
});

const summaryRewritten = rewrittenSummary !== (form.professionalSummary ?? "").trim();
```

Use `rewrittenSummary` as the summary in the output resume object.

Update `buildChangeSummary()` to include when a rewrite happened:
```ts
if (summaryRewritten) {
  summaryParts.unshift("Summary rewritten to 4-sentence standard");
}
```

---

## Step 3 — Ensure `enhanceDirective` fields reach the plan

File: `lib/job-tracker/enhance/enhance-plan.ts`

The plan type needs `targetRole`, and `enhanceDirective` already exists. Confirm these
fields are present on the plan object passed to `applyEnhancePlan()`:
- `plan.targetRole` — from `input.targetRole` or identity store
- `plan.enhanceDirective.summaryTheme` — from JD Brain directive
- `plan.enhanceDirective.roleLevel` — from JD Brain directive
- `plan.enhanceDirective.domain` — from JDIntelligence

If any are missing from the plan type, add them. Do not change how they are derived —
they already come from `buildEnhanceIntelligenceContext()`.

---

## Files to Edit

| File | Change |
|---|---|
| `lib/job-tracker/enhance/apply-enhance-plan.ts` | Wire in `buildDeterministicSummary`, update feedback |
| `lib/job-tracker/enhance/enhance-plan.ts` | Confirm `targetRole` + directive fields on plan type |

## New File

| File | Purpose |
|---|---|
| `lib/job-tracker/enhance/build-deterministic-summary.ts` | Template engine + `deriveYearsOfExperience` |

## Files NOT to touch

- `lib/resume/summary-rules.ts` — read only
- `src/lib/ai/engine/brain.ts` — AI path, out of scope
- `lib/job-tracker/jd/jd-brain.ts` — out of scope
- Any client components or onboarding files

---

## Tests

File: `lib/job-tracker/enhance/build-deterministic-summary.test.ts`

```ts
// 1. Valid existing summary (4 sentences, 70–80 words, no banned words) → returned unchanged
// 2. Empty summary → template built, result is exactly 4 sentences
// 3. Word count: result is 70–80 words
// 4. No SUMMARY_BANNED_WORDS in output ("proven track record", "leverage", "passionate", etc.)
// 5. Sentence 4 uses metric bullet when available ("Reduced deployment time by 40%")
// 6. Sentence 4 falls back to first bullet when no metric bullet exists
// 7. deriveYearsOfExperience: startYear 2018 → (currentYear - 2018)
// 8. deriveYearsOfExperience: no dates → undefined
// 9. deriveYearsOfExperience: 50 years → capped at 20
// 10. Summary with 2 sentences → gets rewritten, not returned as-is
```

Run:
```bash
npx vitest run --config config/vitest.config.ts lib/job-tracker/enhance/build-deterministic-summary.test.ts
npx tsc --noEmit
```

---

## Definition of Done

- [ ] Valid existing summary passes through unchanged
- [ ] Failing summary rewritten to exactly 4 sentences, 70–80 words
- [ ] No banned words in template output
- [ ] Feedback card includes "Summary rewritten to 4-sentence standard" when rewrite happened
- [ ] All tests pass
- [ ] `npx tsc --noEmit` — zero new errors
- [ ] Update this file: change `🔶 OPEN` to `✅ COMPLETED — <date>` in Status above
