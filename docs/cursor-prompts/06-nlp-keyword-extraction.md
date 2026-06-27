# Cursor Prompt 06 — Shared NLP Keyword Extraction

## Status

**✅ COMPLETED — 2026-06-26**

| Deliverable | Status |
|---|---|
| Option A — `jd-directive.ts` MASTER_SKILLS + `isBannedSkill` filter, cap `SKILLS_HARD_MAX` | ✅ Done |
| Option B — `lib/job-tracker/jd/jd-nlp-extractor.ts` (RAKE + wink POS) wired in `jd-extractor.ts` | ✅ Done |
| `lib/job-tracker/jd/keyword-extract.test.ts` — mustAddSkills junk/skill/cap/banned tests | ✅ Done |
| `npm` packages — `wink-nlp`, `wink-eng-lite-web-model`, `rake-js` (substitute; `fast-rake` not on npm) | ✅ Done |

---

## Problem

Raw JD token frequency produced junk keywords (`please`, `email`, `com`, `ensure`, `drive`) in the deterministic enhance path (`mustAddSkills`). AI is off by default, so this path is primary.

---

## Solution

**Layer 1 — Directive guard (`jd-directive.ts`)**

Filter `mustAddSkills` through `MASTER_SKILLS_SET`, drop `isBannedSkill()` hits, cap at `SKILLS_HARD_MAX` (20).

**Layer 2 — NLP extraction (`jd-nlp-extractor.ts`)**

```
JD requirements + responsibilities
  → rake-js multi-word phrases
  → wink-nlp POS filter (NOUN/PROPN/SYM; drop VERB/AUX)
  → MASTER_SKILLS_SET cross-reference + master-skill token scan
  → clean multi-word technical phrases (CI/CD, hyphenated terms)
```

Wired into `jd-extractor.ts` for `mustHaveSkills`, `preferredSkills`, and tier keywords.

**Shared tokenizer** — `keyword-extract.ts` remains for ATS gap analysis (`looksLikeTechTerm`).

---

## Files Edited

| File | Change |
|---|---|
| `lib/job-tracker/jd/jd-directive.ts` | Option A filter on `mustAddSkills` |
| `lib/job-tracker/jd/jd-nlp-extractor.ts` | **New** — RAKE + wink NLP extraction |
| `lib/job-tracker/jd/jd-extractor.ts` | Use NLP extractor instead of regex ranked keywords |
| `lib/job-tracker/jd/keyword-extract.test.ts` | mustAddSkills pipeline tests |
| `package.json` | `wink-nlp`, `wink-eng-lite-web-model`, `rake-js` |

## Files NOT touched

- `jd-segmenter.ts`, `jd-brain.ts`, `build-enhance-intelligence-context.ts`
- AI path code, client components

---

## Definition of Done

- [x] `"the"`, `"ensure"`, `"drive"`, `"ability to"` not in `mustAddSkills`
- [x] `"React Native"`, `"CI/CD"`, `"Python"`, `"AWS"` in `mustAddSkills`
- [x] `mustAddSkills.length <= 20`
- [x] No `isBannedSkill()` items (`communication`, `teamwork`, …)
- [x] `keyword-extract.test.ts` passes
- [x] `npx tsc --noEmit` — zero new errors in changed files
