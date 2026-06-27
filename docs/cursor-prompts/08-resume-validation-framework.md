# Cursor Prompt 08 — Resume Validation Framework

## Status

**✅ IMPLEMENTED** — 2026-06-26

Centralized resume validation for Refinery UI hints and server-side finalize gates.

---

## Entry point

```ts
validateResume(form: HubRefineryForm, targetRole: string): ResumeValidationResult
```

**Location:** `lib/resume/validation/index.ts`

---

## Module layout

| File | Role |
|---|---|
| `lib/resume/validation/types.ts` | `ValidationIssue`, `SectionValidationResult`, `ResumeValidationResult` |
| `lib/resume/validation/validators.ts` | One validator per section (`validateHeader`, `validateTargetRole`, …) |
| `lib/resume/validation/index.ts` | `validateResume()` orchestrator + type re-exports |
| `lib/resume/validation/validators.test.ts` | Vitest coverage for section validators |

**Severity:**

- `"error"` — blocks finalize (`canFinalize === false`)
- `"warning"` — shown as hint (amber)
- `"info"` — muted suggestion (when used)

---

## Where it is used

| Layer | Location | Purpose |
|---|---|---|
| **Client** | `components/onboarding/hub/RefineryPanel.tsx` | Live hints per section (onboarding, `ResumeStudioEditor`, `JobResumeStudioEditor`) |
| **Server gate** | `completeOnboarding()` in `app/actions/onboarding.ts` | Block onboarding finalize when invalid |
| **Server gate** | `saveResumeProfileStudio()` in `app/actions/resume-profiles.ts` | Block profile studio save |
| **Server gate** | `saveJobResumeStudio()` in `app/actions/job-resume-tailor.ts` | Block job-tailored resume save |

`canFinalize` is `true` only when header, target role, summary, skills, and experience have **no errors**. Education is warnings-only and does not block finalize.

---

## Rules enforced

### Header

- **Errors:** `firstName` required, email valid, phone valid
- **Warnings:** empty `lastName`, empty `cityState`, invalid LinkedIn URL format (non-empty only)

### Target role

- **Error:** min 3 characters (after trim)

### Summary

- **Error:** not empty
- **Warnings:** sentence count, word count, banned words (via `validateSummary()` internally)

### Skills

- **Error:** fewer than 6 skills
- **Warnings:** more than 20, banned soft skills, prose-style skill phrases (via `validateSkillsManual()` / `isProseSkill()` internally)

### Experience

- Non-hidden entries only
- **Errors:** at least one visible entry, title required (min 2 chars), `startYear` required, junk title (`/^[^a-zA-Z0-9]+$/`)
- **Warnings:** empty company, empty bullets

### Education

- **Warnings only:** empty degree, empty school, junk school name — education is optional

---

## Rules for callers

**Never** call `validateSummary()`, `validateSkillsManual()`, or `findBannedSkills()` directly in UI components.

**Always** call `validateResume()` and read issues from the result:

```ts
const validation = validateResume(form, targetRole);

// Section hints
validation.summary.issues
validation.skills.issues
validation.header.issues

// Proceed / save gates
validation.canFinalize
```

Low-level rule helpers stay inside `lib/resume/validation/validators.ts` only.

---

## Related session changes

- **Onboarding auto-enhance:** `enhanceResumeOnboarding()` in `app/actions/ai/enhance-resume.ts` runs deterministic enhance after upload (`app/onboarding/page.tsx` → `handleFuelParsed`). Enhance with AI button removed from onboarding.
- **Sign-out:** `lib/auth/client-storage.ts` clears all EasySubmit web client storage including workbench session draft.
- **Deterministic post-process:** `runDeterministicResumeEnhance()` applies `postProcessProfessionalSummary` and `postProcessSkillsText` on the deterministic path (same as AI Step 14 cleanup).

---

## Tests

```bash
npx vitest run --config config/vitest.config.ts lib/resume/validation/validators.test.ts
npx vitest run --config config/vitest.config.ts lib/auth/sign-out-client.test.ts
```
