# Cursor Prompt 01 — Professional Summary Rules

## Status

`lib/resume/summary-rules.ts` and the onboarding `RefineryPanel` live hints are already
implemented. This prompt covers the remaining enforcement gaps.

---

## Rules (non-negotiable)

- **Exactly 4 sentences**
- **70–80 words**
- **Tone:** scholarly, peer-to-practitioner — no AI-isms
- **Structure:** Role identity → Method/approach → Specialization → Quantified impact
- **Banned phrases:** `SUMMARY_BANNED_WORDS` in `lib/resume/summary-rules.ts`

---

## What is Already Done

| Surface | Status |
|---|---|
| `lib/resume/summary-rules.ts` — `validateSummary()`, `SUMMARY_BANNED_WORDS`, constants | ✅ Done |
| `RefineryPanel` onboarding/Studio live hints (word count, sentence count, banned words) | ✅ Done |

---

## What Still Needs to Be Done

### 1. AI prompt — `src/lib/ai/engine/brain.ts`

Find the summary instruction (around line 21). Update it from the current vague phrasing to:

```
Professional summary: exactly 4 sentences, 70–80 words.
Tone: scholarly, peer-to-practitioner — specific methods, measurable impact.
Structure: [Role identity] → [Method/approach] → [Specialization] → [Quantified result].
Avoid: "leverage", "spearhead", "passionate", "dynamic", "results-driven", "thought leader",
"proven track record", "detail-oriented", "self-starter", and any other resume clichés.
Never write in first person. Never start with "I".
```

Also update `summarySentencesMax` in `src/lib/ai/engine/candidate-context.ts`:
- Lines ~86 and ~95: change `summarySentencesMax: 3` → `4`

### 2. AI post-process — `src/lib/ai/engine/post-process.ts`

After the AI returns a summary, validate it with `validateSummary()` from
`lib/resume/summary-rules.ts`. If `sentenceError` or `wordError` is non-null, log a warning to
the console (do not throw — AI output is best-effort). Do not rewrite the summary here; just flag.

Import: `validateSummary` from `@/lib/resume/summary-rules`

### 3. Readiness score — `lib/job-tracker/ats/resume-readiness-score.ts`

Add summary validation to the readiness score calculation:

- If `sentenceError` → deduct readiness points (use existing deduction pattern in the file)
- If `bannedWords.length > 0` → soft deduction
- Add a `summaryWarnings: string[]` field to the score output that surfaces these to the review
  screen ATS tab

Import: `validateSummary` from `@/lib/resume/summary-rules`

### 4. Deterministic fallback feedback — `lib/job-tracker/enhance/enhance-plan.ts`

When building the enhance plan, if the existing summary fails `validateSummary()`:
- Add a `summaryFlag` to the plan output (do not rewrite the summary — flag it only)
- The flag text: `"Summary needs review: {sentenceError or wordError}"`
- Surface this flag in the fallback feedback returned to the UI (`fallbackSummary` field)

---

## Files to Edit

| File | Change |
|---|---|
| `src/lib/ai/engine/brain.ts` | Update summary instruction — 4 sentences, 70–80 words, tone rules |
| `src/lib/ai/engine/candidate-context.ts` | `summarySentencesMax: 3` → `4` (lines ~86, ~95) |
| `src/lib/ai/engine/post-process.ts` | Validate AI summary output, log warnings |
| `lib/job-tracker/ats/resume-readiness-score.ts` | Add summary validation to score + warnings |
| `lib/job-tracker/enhance/enhance-plan.ts` | Add `summaryFlag` to plan when summary fails validation |

## Files NOT to touch

- `lib/resume/summary-rules.ts` — already correct, do not modify
- `components/onboarding/hub/RefineryPanel.tsx` — already has live hints, do not modify

---

## Tests

Add to `lib/ai/engine/post-process.test.ts`:

```ts
// validateSummary called on AI summary output
// sentenceError present → warning logged (no throw)
```

Add to `lib/job-tracker/ats/resume-readiness-score.ts` test file (if exists):

```ts
// summary with 2 sentences → readiness deduction
// summary with banned word "leverage" → soft deduction + bannedWords in output
```

Run: `npx vitest run --config config/vitest.config.ts`

---

## Definition of Done

- [ ] AI prompt instructs 4 sentences, 70–80 words, tone rules, banned list
- [ ] `summarySentencesMax` is 4 in candidate-context
- [ ] Post-process validates and logs warnings on bad AI summary
- [ ] Readiness score deducts for sentence/word violations, surfaces `summaryWarnings`
- [ ] Enhance plan flags invalid summary without rewriting it
- [ ] `npx tsc --noEmit` — zero new errors
