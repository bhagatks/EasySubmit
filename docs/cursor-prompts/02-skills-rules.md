# Cursor Prompt 02 — Skills Rules Enforcement

## Status

`lib/resume/skills-rules.ts` and `StudioSkillsField` enforcement are already implemented.
This prompt covers the remaining gaps in the AI path, readiness score, and enhance plan.

---

## Rules (non-negotiable)

| Context | Min | Target | Max |
|---|---|---|---|
| Manual (Studio) | 6 | 10–15 | 20 |
| AI / deterministic | 15 | 15–20 | 20 |

- Banned slot-wasters: `SKILLS_BANNED_SLOT_WASTERS` in `lib/resume/skills-rules.ts`
- Prose detection: >4 words OR action verbs → rejected as skill token
- No skill ratings, no prose sentences in the skills section

---

## What is Already Done

| Surface | Status |
|---|---|
| `lib/resume/skills-rules.ts` — all constants and validators | ✅ Done |
| `StudioSkillsField` — count color, banned warnings, prose blocking, hard max | ✅ Done |

---

## What Still Needs to Be Done

### 1. AI prompt — `src/lib/ai/engine/brain.ts`

Find the skills instruction (around line 10). Update from the current "6–12 items" to:

```
Skills: 15–20 specific, ATS-scannable items. Each must be a tool, technology, certification,
methodology, or domain — not a soft skill, not a sentence.
Banned: communication, teamwork, leadership, hard worker, attention to detail, time management,
adaptability, creativity, problem solving, multitasking, collaboration, motivated, flexible,
people skills, interpersonal skills, work ethic.
Format: comma-separated values only. No bullet points. No ratings.
```

Also update `maxSkills` in `src/lib/ai/engine/candidate-context.ts`:
- Lines ~85 and ~94: change `maxSkills: 25` → `20`, `maxSkills: 15` → `20`

### 2. AI post-process — `src/lib/ai/engine/post-process.ts`

After the AI returns skills, run `validateSkillsSystem()` from `lib/resume/skills-rules.ts`:

- Filter out any skill that passes `isBannedSkill()` — remove it from the output
- Filter out any skill that passes `isProseSkill()` — remove it from the output
- If resulting count < `SKILLS_HARD_MIN_SYSTEM` (15), log a warning (do not throw)
- Cap at `SKILLS_HARD_MAX` (20)

Import: `validateSkillsSystem`, `isBannedSkill`, `isProseSkill`, `SKILLS_HARD_MAX`,
`SKILLS_HARD_MIN_SYSTEM` from `@/lib/resume/skills-rules`

### 3. Readiness score — `lib/job-tracker/ats/resume-readiness-score.ts`

Add skills validation to the readiness score:

- `count < SKILLS_HARD_MIN_MANUAL` (6) → major deduction
- `count < SKILLS_TARGET_MIN` (10) → minor deduction
- `banned.length > 0` → soft deduction proportional to banned count
- `compositionWarning` non-null → flag in output
- Add `skillsWarnings: string[]` to score output

Import: `validateSkillsManual` from `@/lib/resume/skills-rules`

### 4. Enhance plan — `lib/job-tracker/enhance/enhance-plan.ts`

When building the enhance plan from the existing resume:

- Run `validateSkillsManual()` on existing skills
- If `countWarning` or `compositionWarning` is non-null → add to plan warnings
- The `mustAddSkills` list must be pre-filtered: only skills in `MASTER_SKILLS_SET` (see
  Prompt 04 for the set construction) AND not already `isBannedSkill()`

---

## Files to Edit

| File | Change |
|---|---|
| `src/lib/ai/engine/brain.ts` | Update skills instruction — 15–20, banned list, format rules |
| `src/lib/ai/engine/candidate-context.ts` | `maxSkills` → 20 on both branches |
| `src/lib/ai/engine/post-process.ts` | Filter banned/prose skills, cap at 20, log warnings |
| `lib/job-tracker/ats/resume-readiness-score.ts` | Add skills validation to score + warnings |
| `lib/job-tracker/enhance/enhance-plan.ts` | Pre-filter `mustAddSkills`, add skills warnings to plan |

## Files NOT to touch

- `lib/resume/skills-rules.ts` — already correct, do not modify
- `components/onboarding/hub/StudioSkillsField.tsx` — already enforces rules, do not modify

---

## Tests

Add to `lib/ai/engine/post-process.test.ts`:

```ts
// "communication" in AI skills output → removed by post-process
// "Is responsible for managing teams" in AI skills → removed (prose)
// Skills array after post-process: length <= 20
```

Add to readiness score test file:

```ts
// 3 skills → major deduction
// 8 skills → minor deduction
// "leadership" in skills → soft deduction + in skillsWarnings
```

Run: `npx vitest run --config config/vitest.config.ts`

---

## Definition of Done

- [ ] AI prompt instructs 15–20 skills, banned list, format rules
- [ ] `maxSkills` is 20 in both candidate-context branches
- [ ] Post-process removes banned and prose skills from AI output
- [ ] Readiness score includes skills deductions and `skillsWarnings`
- [ ] Enhance plan pre-filters `mustAddSkills` to master set, excludes banned
- [ ] `npx tsc --noEmit` — zero new errors
