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

> **Canonical 8-step ladder lives in [`APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md).** This is a summary only.

1. Exact `fieldSignature` + same `tenantHost`
2. Same `automationId` cross-tenant
3. `semanticKey` match
4. `answer-vault` (local interim — migration compat)
5. `applicationProfile` JSONB (work auth, EEO, salary, address)
6. Resume / tailor map (name, email, phone, experience)
7. Local template engine (open-ended fields — all users)
8. AI generation (open-ended fields — BYOK only)
→ Blank + visual indicator

Auto-fill at `confidence >= 0.85`. `0.6–0.85` → pre-fill + yellow ring on field + card indicator.

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

> **Superseded by [`APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md)** for full spec (UX, setup screens, generation triggers, AI gating).
> This section is kept for DB/API context only.

Storage: `users.applicationProfile` JSONB — one row per user (not per resume profile).

Fields covered: work auth, visa sponsorship, salary range, start date, EEO prefs, address (lazily captured on first form that needs it — not in setup screens).

Resolution: inserted at step 4 in the ladder below (between Field Memory and resume map).

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

| State | Behavior |
|-------|----------|
| Scanning | Step indicator in assist card |
| Partial fill | Field count in assist card |
| New field | Visual warning icon — no text copy, no prompt |
| Medium confidence (0.6–0.85) | Pre-fill + yellow ring on field + card indicator |
| Blank | Warning icon in assist card only |
| AI error | Error icon → links to settings |

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
| **v2** | Application Profile setup screens + full resolution ladder (see `APPLICATION_PROFILE.md`) |
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
