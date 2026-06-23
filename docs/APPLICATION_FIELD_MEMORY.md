# Application Field Memory — architecture

> Status: **Spec approved for implementation** (2026-06-22)  
> Owner lane: **Cursor** (`cursor/field-memory`) — schema + API + dashboard list  
> Depends on: Workday field **discovery** in extension (Claude — Phase C)

Learn answers from Workday apply wizards, persist per user in Postgres, reuse on similar fields next time.

Related: `src/shared/extension/answer-vault.ts` (local interim), `docs/WORKDAY_ONE_CLICK_APPLY.md`, `docs/EXTENSION_DETECTION.md`.

---

## Problem

Workday apply flows are multi-step wizards with employer-specific and generic questions. Resume data alone does not cover work authorization, EEO, custom essays, or employer dropdowns. Re-asking the same questions every application is the main friction Simplify solves with saved answers — we need a **server-backed**, confidence-aware version.

---

## Goals

| Goal | Metric |
|------|--------|
| Fill known fields automatically on repeat | ≥80% of repeat semantic questions on 2nd+ apply |
| Learn from user without extra forms | Capture on edit + step continue |
| Safe reuse | Confidence threshold; never auto-fill denylisted fields |
| Cross-device | DB source of truth; extension syncs |

Non-goals v1: auto-submit; sharing answers across users; full page HTML snapshots.

---

## Concepts

### FieldDescriptor (discovered on each wizard step)

```ts
type FieldDescriptor = {
  platform: "workday"; // later: greenhouse | lever | ...
  tenantHost: string;  // e.g. walmart.wd504.myworkdayjobs.com
  stepFingerprint: string; // URL segment + step heading / progress id
  automationId: string | null; // data-automation-id
  label: string;       // visible label or aria-label
  fieldType: "text" | "textarea" | "select" | "radio" | "checkbox" | "file";
  options?: string[];  // select/radio options (for optionsHash)
  required: boolean;
};
```

### Keys

| Key | Formula | Use |
|-----|---------|-----|
| `fieldSignature` | hash(`platform`, `tenantHost`, `automationId`, `normalize(label)`, `fieldType`, `optionsHash`) | Exact match per employer field |
| `semanticKey` | hash(`platform`, `normalize(label)`, `fieldType`, `categoryHint?`) | Cross-employer reuse |
| `categoryHint` | classifier: `work_auth`, `sponsorship`, `veteran`, `eeo_gender`, `custom_essay`, … | Application Profile + matching |

### Answer value (JSON)

```ts
type StoredAnswer =
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "option"; value: string; optionLabel?: string }
  | { kind: "file_ref"; source: "tailored_resume"; jobEntryId: string }
  | { kind: "file_ref"; source: "profile_resume"; profileId: string };
```

File fields: **do not** store PDF bytes — store pointer; generate export at fill time.

---

## Runtime flow

```text
Workday apply step loads
  → SCAN: pierce shadow DOM, build FieldDescriptor[]
  → LOOKUP: GET /api/extension/application-answers?platform=workday&tenantHost=...&step=...
  → RESOLVE each field (priority ladder below)
  → FILL high-confidence fields
  → WATCH: input/change on remaining fields
  → On step Continue OR blur-after-edit: CAPTURE events
  → POST /api/extension/application-answers/capture (batch)
  → Next step: repeat SCAN
```

### Resolution ladder (per field)

1. `userId` + exact `fieldSignature` + same `tenantHost`
2. `userId` + `platform` + `automationId` (any tenant on Workday)
3. `userId` + `semanticKey`
4. `userId` + normalized `label` only (compat with `answer-vault`)
5. **Application Profile** (work auth, address, EEO prefs — separate table/JSON)
6. **Resume / tailor map** (name, email, experience rows)
7. **Miss** — leave empty; card shows “New question — we'll remember your answer”

Auto-fill only when `confidence >= 0.85`. `0.6–0.85` → pre-fill + highlight for review.

### Capture triggers

| Event | Action |
|-------|--------|
| User types in unfilled field | `source: "user"` |
| User edits autofill value | `source: "user_corrected"` — update answer, boost trust in correction |
| User leaves field unchanged after autofill | `source: "autofill_accepted"` |
| Step Continue clicked | Batch flush all visible fields with values |

### Denylist (never capture or autofill)

SSN, tax ID, bank account, password, credit card, fields matching `/social security|ssn|sin\b|password/i`.

---

## Application Profile (companion data — not Field Memory)

Collected **lazily** before first Workday autofill (not in onboarding):

| Field | Required for Workday page 1 |
|-------|----------------------------|
| Street line 1, line 2, city, state, postal, country | Yes |
| Authorized to work (country) | Yes |
| Require sponsorship now / future | Yes |
| EEO preferences (gender, race, veteran, disability) + “prefer not to answer” | Before EEO step |

Storage: `users.applicationProfile` JSONB or `application_profiles` table — **one row per user** (not per resume profile).

---

## Database

### `user_application_answers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | cuid | PK |
| `userId` | FK → users | |
| `fieldSignature` | string | unique with userId |
| `platform` | string | workday, … |
| `tenantHost` | string? | null = cross-tenant semantic only |
| `automationId` | string? | |
| `semanticKey` | string | indexed |
| `label` | string | last seen label (Settings UI) |
| `fieldType` | string | |
| `optionsHash` | string? | select option set fingerprint |
| `answer` | jsonb | StoredAnswer |
| `confidence` | float | 0–1, rolling |
| `hitCount` | int | |
| `correctCount` | int | user_corrected decrements trust |
| `lastUsedAt` | datetime | |
| `createdAt` / `updatedAt` | datetime | |

Indexes: `@@unique([userId, fieldSignature])`, `@@index([userId, semanticKey])`, `@@index([userId, platform, automationId])`.

### Optional v2: `application_step_templates`

Anonymous wizard shape (no answers): `platform`, `tenantHost`, `stepFingerprint`, `fieldSignatures[]` — for preflight UX only.

---

## API

Extension (bearer token):

```
GET  /api/extension/application-answers
     ?platform=workday&tenantHost=...&stepFingerprint=...
     → { answers: Record<fieldSignature, { answer, confidence, semanticKey }> }

POST /api/extension/application-answers/capture
     Body: { events: Array<{ field: FieldDescriptor, answer: StoredAnswer, source, jobEntryId? }> }
     → { upserted: number }
```

Dashboard:

```
GET    /api/application-answers        → list for Settings
PATCH  /api/application-answers/:id    → user edit
DELETE /api/application-answers/:id
```

---

## Extension UX

| State | Card copy |
|-------|-----------|
| Scanning | “Step 2 of 5 — Experience” |
| Partial fill | “Filled 8 of 12 fields” |
| New field | “New question — saved when you continue” |
| Review | Yellow ring on medium-confidence fields |
| Blocked | “Complete Application Profile” link |

Settings: **Application answers** — searchable table (label, answer, last used, delete).

---

## Migration from `answer-vault.ts`

1. On extension connect / login: read `chrome.storage.sync` vault → `POST /capture` merge by `semanticKey`.
2. Runtime: prefer server lookup; on capture write **both** until vault deprecated.
3. Remove local-only vault when server coverage stable.

---

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **v1** | Prisma + capture/lookup API; extension capture on user edit; exact + semanticKey match |
| **v2** | Application Profile + preflight gate before pipeline |
| **v3** | Confidence scoring + Settings UI |
| **v4** | Step templates + other ATS platforms |

---

## Test plan

- Unit: `fieldSignature` / `semanticKey` stable across label whitespace changes
- Unit: resolution ladder ordering
- Unit: denylist blocks SSN fields
- Integration: capture → lookup roundtrip per user
- Manual: same Workday tenant twice — 2nd apply autofills custom question

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-22 | Initial spec (Cursor design session) |
