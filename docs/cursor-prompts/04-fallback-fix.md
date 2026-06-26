# Cursor Prompt 04 — Fix Deterministic Fallback Enhance

## Problem

When the AI enhance call fails, EasySubmit falls back to a deterministic enhancer. It currently
produces broken output:
- Garbage skills injected from raw JD tokens ("the", "ensure", "drive", etc.)
- Bullet repetition loops ("Executed executed executed…")
- Summary stripped down to a bare title line

## Root Cause

`lib/job-tracker/ats/job-intelligence.ts` — `classifyKeyword()` has this rule:

```ts
if (!kw.includes(" ") && kw.length <= 20) return "skill";
```

This treats any short single JD token as a skill. The fix is to only classify a token as a skill
if it exists in the master skills list.

---

## Changes Required

### 1. Fix `classifyKeyword()` — `lib/job-tracker/ats/job-intelligence.ts`

Import the master skills array from `src/lib/constants/skills.ts`. Build a `Set` once at module
level for O(1) lookup:

```ts
import { MASTER_SKILLS } from "@/src/lib/constants/skills";
const MASTER_SKILLS_SET = new Set(MASTER_SKILLS.map((s) => s.toLowerCase()));
```

Replace the "short token = skill" branch with:

```ts
if (MASTER_SKILLS_SET.has(kw.toLowerCase())) return "skill";
```

No other changes to this file.

### 2. Add bullet dedup guard — `lib/job-tracker/ats/deterministic-enhancer.ts`

Add this utility at the top of the file:

```ts
function dedupeConsecutiveWords(text: string): string {
  return text.replace(/\b(\w+)(\s+\1)+\b/gi, "$1").replace(/\s{2,}/g, " ").trim();
}
```

Apply it to every bullet string after assembly — wherever bullets are built or copied into the
output resume. Example:

```ts
bullets: entry.bullets.map((b) => dedupeConsecutiveWords(b)),
```

### 3. Preserve existing summary — `lib/job-tracker/ats/deterministic-enhancer.ts`

The fallback must not touch `resume.summary` if it is already non-empty. Find the place where
summary is set and add a guard:

```ts
summary: resume.summary?.trim() ? resume.summary : fallbackGeneratedSummary,
```

If the existing summary is non-empty, pass it through unchanged. Only generate/populate a summary
when it is empty or null.

### 4. Cap skills to master set only — `lib/job-tracker/ats/deterministic-enhancer.ts`

When the fallback merges `mustAddSkills` into the resume skills:

- Filter `mustAddSkills` to only tokens present in `MASTER_SKILLS_SET`
- Deduplicate against existing resume skills (case-insensitive)
- Cap total to `SKILLS_HARD_MAX` (20)

Import: `SKILLS_HARD_MAX` from `@/lib/resume/skills-rules`

```ts
import { SKILLS_HARD_MAX } from "@/lib/resume/skills-rules";

const validNewSkills = mustAddSkills.filter((s) => MASTER_SKILLS_SET.has(s.toLowerCase()));
const merged = [...existingSkills];
for (const skill of validNewSkills) {
  if (!merged.some((e) => e.toLowerCase() === skill.toLowerCase())) {
    merged.push(skill);
  }
  if (merged.length >= SKILLS_HARD_MAX) break;
}
```

### 5. Extract `runDeterministicEnhance()` helper — `lib/ai/enhance-resume-for-user.ts`

The deterministic fallback logic currently lives inline in the catch block. Extract it into a
named exported helper so it can be called from the new `ai_disabled` / `ai_globally_disabled`
error branches (added in Prompt 03):

```ts
export async function runDeterministicEnhance(
  resumeId: string,
  jobDescription: string,
): Promise<{ success: boolean; fallbackUsed: true; fallbackSummary?: string; error?: string }>
```

The catch block and the `ai_disabled` / `ai_globally_disabled` branches both call this helper.
No duplicate logic.

---

## Files to Edit

| File | Change |
|---|---|
| `lib/job-tracker/ats/job-intelligence.ts` | Fix `classifyKeyword()` — master set allowlist only |
| `lib/job-tracker/ats/deterministic-enhancer.ts` | Bullet dedup, summary preservation, skills cap |
| `lib/ai/enhance-resume-for-user.ts` | Extract `runDeterministicEnhance()` helper |

## Files NOT to touch

- `src/lib/ai/engine/router.ts` — handled in Prompt 03
- `lib/job-tracker/ats/keyword-gap.ts` — keyword gap is separate
- Anything in the AI path

---

## Tests

File: `lib/job-tracker/ats/deterministic-enhancer.test.ts`

```ts
// classifyKeyword: "the", "ensure", "drive" → not classified as skill
// classifyKeyword: "Python", "React", "AWS" → classified as skill (in master set)
// dedupeConsecutiveWords("Executed executed executed results") → "Executed results"
// summary preservation: non-empty summary in → same summary out unchanged
// skills cap: output skills array length <= 20
// skills filter: non-master-list tokens in mustAddSkills are not added to output
```

Run: `npx vitest run --config config/vitest.config.ts lib/job-tracker/ats/deterministic-enhancer.test.ts`

---

## Definition of Done

- [ ] No JD tokens outside the master skills list appear in fallback output skills
- [ ] Bullet dedup applied to all fallback-generated bullets
- [ ] Non-empty existing summary passes through untouched
- [ ] `runDeterministicEnhance()` is a named reusable helper
- [ ] All new tests pass
- [ ] `npx tsc --noEmit` — zero new errors in changed files
