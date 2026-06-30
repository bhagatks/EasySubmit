# EasySubmit — Application Profile & Assist Field Capture

> Status: Design (not yet implemented)
> Last updated: 2026-06-23

Covers the one-time application profile capture, intelligent field detection, open-ended question handling, resume/cover letter generation, and the silent learn-from-user loop.

Complements [`SYNC_ARCHITECTURE.md`](./SYNC_ARCHITECTURE.md) and [`APPLICATION_FIELD_MEMORY.md`](./APPLICATION_FIELD_MEMORY.md).

> Previously named `ASSIST_PROFILE.md` — renamed to match canonical naming.

---

## Decisions log

| # | Question | Decision |
|---|----------|----------|
| 1 | Assist UX: suggest vs auto-fill | **Auto-fill silently.** `SYNC_ARCHITECTURE.md` "copy/insert" was early thinking — superseded by this doc. |
| 2 | Naming | **Application profile** everywhere. "Assist profile" retired. |
| 3 | Address fields | **Captured on first form that needs it (any platform).** Not in setup screens. User fills once, silently saved to `applicationProfile`. No prompt. |
| 4 | Open-ended cache vs Field Memory | **Reuse Field Memory** (`user_application_answers` + `semanticKey`). No parallel cache. |
| 5 | Customize resume toggle | Same as deferred "skip-resume pref." **Default: ON.** Managed in account settings. |
| 6 | Proactive tailor when customize on | **Tailor stays proactive** on Apply — writes DB overrides + deterministic cover letter seed. PDFs on-demand only. |
| 7 | Pipeline cover letter seed | **Keep `buildCoverLetterSeedPatch` in pipeline.** Rule is no PDF / no AI cover letter on pipeline — DB template seed is correct and stays. |
| 8 | AI for open-ended fields | **BYOK only, last resort after local engine.** Same routing + quota decrement as Enhance. If AI fails → error icon in card → links to settings. Template used instead. Flow never blocked. |
| 9 | First Apply gate | **Autofill starts immediately.** Setup screens run in parallel. Partial profile saved per screen. Work auth fields left blank + icon if Screen 1 not yet saved — no partial fill from in-progress state. |
| 10 | Salary refinement signals | Stored as signals in `applicationProfile` JSONB — do not overwrite stored range. |
| 11 | File paths | **Extend existing files** — `workday-autofill.ts`, `field-descriptor.ts`, `field-resolution.ts`. No new `adapters/` directory in V1. |
| 12 | "Never stored server-side" scope | **PDF blobs only.** Tailor DB overrides + cover letter seed in `job_resume_tailors` persist as today. No Supabase Storage bucket for PDFs. |
| 13 | EEO skip card copy | **No text copy** — visual warning icon only. Matches "never prompt" principle. |
| 14 | Medium-confidence UI (0.6–0.85) | **Yellow ring on the form field + indicator in assist card.** Blank fields: icon in assist card only (nothing on field). |
| 15 | Cover letter PDF at upload (customize on) | **Template first.** AI only if user already ran AI enhance via Review screen (i.e. AI cover letter already exists in `job_resume_tailors`). No speculative AI call at upload time. |
| 16 | Canonical resolution ladder | **This doc (8 steps) is single source of truth.** `APPLICATION_FIELD_MEMORY.md` ladder trimmed to pointer. |

---

## Goals

- Keep onboarding completely untouched — application profile is separate
- Only ask the user once, triggered on first Apply click
- Never block the resume pipeline — capture runs in parallel, autofill begins immediately
- Learn silently from what users type — never prompt to save
- Auto-fill as much as possible; leave blank rather than prompt when unsure
- Generate resume and cover letter PDFs on-demand only — never proactively, never stored server-side
- Local engine is primary for open-ended fields — AI is last resort before blank
- AI for open-ended fields only when user has BYOK configured

---

## applicationProfile schema

Stored as `users.applicationProfile` JSONB — one row per user, not per resume profile.

```ts
type ApplicationProfile = {
  workAuth: {
    authorizedCountry: string;
    authorized: boolean;
    requiresSponsorship: boolean;
    citizenshipStatus?: "citizen" | "green_card" | "tn" | "ead" | "h1b" | "opt" | "cpt" | "other" | null;
    visaType?: string | null;
  } | null;

  preferences: {
    salary: {
      min: number;
      max: number;
      currency: string;
      signals: number[];             // manual edit values — never overwrite min/max
    };
    earliestStart: "immediately" | "2_weeks" | "1_month" | "flexible";
    workMode: "remote" | "hybrid" | "onsite" | "flexible";
    willingToRelocate?: boolean | null;
    noticePeriod?: "immediate" | "2_weeks" | "1_month" | "2_months" | "flexible" | null;
    desiredJobType?: "full_time" | "part_time" | "contract" | "flexible" | null;
    travelTolerance?: "none" | "25pct" | "50pct" | "75pct" | "any" | null;
  } | null;

  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  } | null;                         // lazy-captured on first form — not in setup screens

  education: {
    highestDegree?: "high_school" | "associate" | "bachelor" | "master" | "phd" | "other" | null;
    fieldOfStudy?: string | null;
    schoolName?: string | null;
    graduationYear?: number | null;
    gpa?: string | null;
  } | null;

  eeo: {
    gender: string;                  // value or "prefer_not_to_say"
    veteran: string;
    disability: string;
    race?: string | null;
    hispanicLatino?: boolean | null;
  } | null;

  identityExtras: {
    preferredName?: string | null;
    pronouns?: string | null;
    githubUrl?: string | null;
    portfolioUrl?: string | null;
  } | null;
};
```

Canonical TypeScript type: `lib/profile/application-profile.ts`

**Patch API:** `PATCH /api/extension/user-prefs` (extend existing endpoint) with body `{ applicationProfile: Partial<ApplicationProfile> }`. Merges at top-level key — does not overwrite unrelated keys.

---

## Canonical resolution ladder (single source of truth)

Applies per field during any ATS form assist. Replaces the 7-step ladder in `APPLICATION_FIELD_MEMORY.md`.

| Step | Source | Scope |
|------|--------|-------|
| 1 | Exact `fieldSignature` + same `tenantHost` | Field Memory — employer-specific exact match |
| 2 | Same `automationId` cross-tenant | Field Memory — Workday cross-employer |
| 3 | `semanticKey` match | Field Memory — cross-employer semantic |
| 4 | `answer-vault` (local, interim) | Compat during migration from local vault |
| 5 | `applicationProfile` JSONB | Work auth, EEO, salary, address |
| 6 | Resume / tailor map | Name, email, phone, experience, skills |
| 7 | Local template engine | Open-ended fields only — all users |
| 8 | AI generation | Open-ended fields only — BYOK only |
| — | Blank + visual indicator | Final fallback |

**Confidence gating:** Steps 1–6 auto-fill at `confidence >= 0.85`. At `0.6–0.85`: pre-fill + yellow ring on the form field + indicator in assist card. Below 0.6 or step 7–8: fill silently (template/AI output is either good or blank).

File fields skip all steps except 5 (file_ref from applicationProfile) — handled by file upload injector.

---

## Application profile field taxonomy

| Category | Fields | When captured |
|----------|--------|---------------|
| **Standard identity** | Name, email, phone, LinkedIn | Resume profile — no capture needed |
| **Identity extras** | Preferred name, pronouns, GitHub URL, portfolio URL | Extension Screen 3 (optional) |
| **Address** | Street, city, state, postal, country | First form that needs it — any platform (lazy) |
| **Work authorization** | Auth status, sponsorship, citizenship status, visa type | Extension Screen 1 (mandatory) |
| **Preferences** | Salary range, earliest start, work mode, notice period, job type, relocation, travel | Extension Screen 1 (mandatory core) + Screen 3 (extras) |
| **Education** | Highest degree, field of study, school, graduation year, GPA | Extension Screen 3 (optional) — or lazy from resume parse |
| **EEO / demographic** | Gender, veteran, disability, race, Hispanic/Latino | Extension Screen 2 (optional, skippable) |
| **Open-ended answers** | Motivation, strengths, experience, culture, referral source | Field Memory (`user_application_answers`) — learned from forms |

---

## First-time capture flow

Triggered on first Apply click when `applicationProfile` is null or incomplete. Extension card expands. Resume generation and autofill begin immediately — setup is parallel, not a gate.

Partial profile saved on each screen completion. Abandoned mid-setup = whatever completed is persisted.

**If work auth fields appear on the form before Screen 1 is saved:** leave blank + icon. No partial fill from in-progress state.

### Screen 1 — Mandatory

Fields saved to `applicationProfile.workAuth` and `applicationProfile.preferences`. Blocks autofill of work auth fields on forms until saved.

- Are you authorized to work in [country]? (yes/no)
- Citizenship / authorization type (citizen, green card, EAD, H-1B, OPT, CPT, TN, other)
- Visa type — only shown when citizenship type is not citizen/green card (free text)
- Visa sponsorship required? (yes/no)
- Desired salary range (min + max + currency)
- Earliest start date (immediately / 2 weeks / 1 month / flexible)
- Preferred work mode (remote / hybrid / on-site / flexible)
- "Continue" → saves Screen 1 immediately → Screen 2

### Screen 2 — Optional (EEO)

Fields saved to `applicationProfile.eeo`. Entire screen is skippable.

- "Skip all →" at top
- Gender identity (with "prefer not to say")
- Veteran status (with "prefer not to say")
- Disability status (with "prefer not to say")
- Race / ethnicity (with "prefer not to say") — US standard EEO
- Hispanic or Latino? (yes / no / prefer not to say)
- "Finish setup" → saves Screen 2 → Screen 3

### Screen 3 — Optional extras ("Help us fill more fields")

Fields saved to `applicationProfile.identityExtras`, `applicationProfile.preferences` (extras), and `applicationProfile.education`. Fully skippable per field — no "save all" gate.

- Preferred name / nickname (text)
- Pronouns (text — she/her, he/him, they/them, or custom)
- GitHub URL (text)
- Portfolio / personal website URL (text)
- Notice period (immediate / 2 weeks / 1 month / 2 months / flexible)
- Job type preference (full-time / part-time / contract / flexible)
- Willing to relocate? (yes / no)
- Willing to travel? (none / up to 25% / 50% / 75% / any)
- Highest degree (select)
- Field of study / major (text)
- School / university (text)
- Graduation year (number)
- GPA (text — optional, for early-career)
- "Done" → saves whatever is filled → card collapses to Stage 1 view

---

## Salary range → fixed field resolution

| Field label signal | Value used |
|--------------------|------------|
| "Expected" / "desired" / ambiguous | Midpoint of `(min + max) / 2` |
| "Minimum" / "at least" | `min` |
| "Maximum" / "up to" | `max` |

Manual edits appended to `salary.signals[]` — never overwrite `min`/`max`.

---

## Semantic seed list (Tier 2 — `user_application_answers`)

Open-ended and misc fields that can't be collected upfront. Stored in `user_application_answers` via the field memory capture loop, matched cross-employer using `semanticKey`.

Canonical seed definitions: `src/shared/extension/semantic-seed.ts` — each entry has `key`, `label`, `category`, `fieldType`, and `labelPatterns[]`.

| Semantic key | Label | Category |
|---|---|---|
| `oe__why_company` | Why this company / role | open_ended |
| `oe__strengths` | Key strengths | open_ended |
| `oe__experience_description` | Relevant experience description | open_ended |
| `oe__years_total_experience` | Total years of experience | open_ended |
| `oe__years_with_x` | Years of experience with [skill] | open_ended |
| `oe__culture_fit` | Culture / team fit | open_ended |
| `oe__availability_detail` | Availability / start date detail | open_ended |
| `oe__cover_letter_text` | Cover letter (text field) | open_ended |
| `oe__additional_info` | Additional information | open_ended |
| `misc__referral_source` | How did you hear about this role | misc |
| `misc__security_clearance` | Security clearance | misc |
| `consent__background_check` | Background check consent | consent |
| `consent__nda` | NDA consent | consent |

Fields with `resolvedFromProfile: true` are resolved via `applicationProfile` (step 5 of ladder) — they appear in the seed list for classification only, not stored as answers.

## Silent learn-from-user loop

No new storage layer — extends Field Memory capture triggers.

- `blur` / `change` on all visible inputs during assist
- Maps to `applicationProfile` category → `PATCH /api/extension/user-prefs` silently
- Open-ended → `POST /api/extension/application-answers/capture` with `source: "user"`
- No prompt ever

---

## Open-ended question handling

**Local engine is primary. AI is last resort before blank.**

### Step 7 — Local template engine (all users)

Classifies question type, composes answer from real resume data. Extends `cover-letter-template-matrix.ts`.

| Question type | Approach |
|---------------|----------|
| Motivation / why this company | `whyCompany` block + company name from JD |
| Strength | Top skill from resume + one achievement line |
| Experience with X | Years derived from resume experience entries |
| Availability | From `applicationProfile.preferences.earliestStart` |
| Salary | Midpoint of stored range |
| Culture fit | `whyCompany` + role alignment from resume summary |

### Step 8 — AI generation (BYOK only)

Only when BYOK configured AND local template produced low-confidence output. Same routing + quota decrement as Enhance.

If AI fails (bad key / quota / network):
- Error icon in extension card → links to settings
- Template answer used instead
- Flow never blocked

### Blank (final fallback)

Blank field + visual warning icon in assist card. No text copy. When user fills manually → saved to Field Memory silently.

---

## Resume & cover letter generation

### Demand-driven only

| Trigger | Resume | Cover letter |
|---------|--------|--------------|
| User opens Review screen | Yes | Yes (if exists in `job_resume_tailors`) |
| Resume upload slot detected | Yes | — |
| Cover letter upload slot detected | — | Yes |
| User clicks Download | Yes / Yes | — / — |
| Pipeline tailor completes | Never — DB overrides only | Never — seed only, no PDF |
| Auto-apply (future) | Yes | Yes if slot detected |

### Pipeline cover letter note

`runPipelineTailor` seeds a deterministic cover letter into `job_resume_tailors` via `buildCoverLetterSeedPatch`. This is correct and stays. "No cover letter on pipeline" means no PDF export and no AI call — the DB seed is fine.

### Cover letter PDF priority (customize ON, upload slot detected)

1. If AI-enhanced cover letter already exists in `job_resume_tailors` (user ran enhance via Review) → use that → PDF
2. Otherwise → `composeCoverLetterFromMatrix()` template → PDF
3. Never call AI speculatively at upload time

### Cover letter field detection

Only triggers on `fieldType === "file"` with label matching: "cover letter", "motivation letter", "letter of interest".

### Generation paths

**Resume endpoint:** `GET /api/extension/jobs/:id/resume-pdf`
- Customize on → `buildResumePdf()` with tailored overrides
- Customize off → `buildResumePdf()` with default profile

**Cover letter endpoint:** `GET /api/extension/jobs/:id/cover-letter-pdf`
- Customize on → AI if already enhanced, else template
- Customize off → template always

### In-memory only

`ArrayBuffer` → `new File([bytes], ...)` → `DataTransfer` → inject → discard. No caching.

### File upload mechanism

Standard `<input type="file">` (Greenhouse, Lever, generic): `DataTransfer` + `change` event.
Workday: drag-and-drop simulation onto drop zone — handled in `workday-autofill.ts`.
Fallback: warning icon on field in assist card — no prompt.

### Customize resume toggle

| | |
|---|---|
| Storage | `User` model — new field, not yet in schema |
| Default | **ON** (preserves current behavior) |
| Managed in | Account settings |
| Read by | `getExtensionUserPrefs()` at pipeline start |
| Off behavior | Skip `runPipelineTailor`, use default profile, auto-advance to `READY_TO_APPLY` |
| On behavior | Full tailor pipeline as today (proactive, writes `job_resume_tailors`) |

---

## What needs to be built

| What | Where | Notes |
|------|-------|-------|
| `applicationProfile` JSONB + typed schema | `prisma/schema.prisma` | See schema block above |
| `PATCH /api/extension/user-prefs` extend | `app/api/extension/user-prefs/route.ts` | Merge at top-level key |
| Customize resume toggle | `User` model + `getExtensionUserPrefs()` | Account settings UI; default ON |
| Setup screens (Screen 1 + 2) | Extension card expanded state | Parallel to pipeline; partial save per screen |
| Address lazy capture | Field detection + prefs patch | Any platform; first address field seen |
| `applicationProfile` resolution (step 5) | `field-resolution.ts` | Between vault and resume map |
| Salary resolver | `field-resolution.ts` | Midpoint / min / max logic |
| Generic field detection | Extend `workday-autofill.ts` | Label-match for non-Workday forms |
| Cover letter field detection | Extend field type detection | File input label patterns |
| Medium-confidence UI | Assist card + form field | Yellow ring on field + card indicator |
| AI tier BYOK gate | `lib/ai/` + BYOK check | Error icon on fail; template fallback |
| Template tier for open-ended | Extend `cover-letter-template-matrix.ts` | New question-type blocks |
| Resume PDF endpoint | `app/api/extension/jobs/[id]/resume-pdf/route.ts` | On-demand, streams bytes |
| Cover letter PDF endpoint | `app/api/extension/jobs/[id]/cover-letter-pdf/route.ts` | Priority: existing AI → template |
| File upload injector | `src/shared/extension/file-inject.ts` | DataTransfer standard; Workday drag-drop in `workday-autofill.ts` |

---

## Relationship to APPLICATION_FIELD_MEMORY.md

`APPLICATION_FIELD_MEMORY.md` owns: DB schema (`user_application_answers`), capture/lookup API, denylist, vault migration, step templates (v2).

This doc owns: `applicationProfile` schema + patch API, setup UX, resolution ladder (canonical), generation triggers, resume/cover letter paths, AI gating, confidence UI.

The 8-step ladder here supersedes the 7-step ladder in `APPLICATION_FIELD_MEMORY.md`. That doc's ladder section now points here.

---

## Deferred

- Per-job salary override
- EEO re-prompt after skip (account settings)
- Address in setup screens (V2 — lazy capture is V1)
- iCIMS, Taleo, SmartRecruiters adapters
- AI answer confidence scoring
- `application_step_templates` (Field Memory v2)
