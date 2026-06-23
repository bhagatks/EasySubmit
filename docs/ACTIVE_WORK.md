# Active work — agent coordination

**Update this file before each Cursor or Claude session.**  
Both agents should read it first. Only one agent should edit a given path at a time.

Last updated: **2026-06-22** (Cursor active on `cursor/field-memory`)

---

## Claude Phase C — merged on `main`

Branch: `claude/workday-autofill-phase-c` → merged (`1aea091`)

Workday autofill emits `__easysubmit_field_capture__` via `CustomEvent` + `field-descriptor.ts` types.

---

## Cursor Field Memory — in progress

Branch: `cursor/field-memory`

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Prisma `user_application_answers` + migration | Done |
| 2 | `GET/POST /api/extension/application-answers*` | Done |
| 3 | Content script bridge → background → capture API | Done |
| 4 | Settings UI list/edit | Not started (v3) |
| 5 | Lookup wired into autofill resolution ladder | Not started (v1 follow-up) |

**Cursor owns** `lib/extension/application-field-memory.ts`, `app/api/extension/application-answers/*`, `field-capture-bridge.ts`, `field-capture-api.ts`.

**Do not touch** `workday-autofill.ts` unless coordinating with Claude.

---

## Integration contract (Claude → Cursor)

Claude emits; Cursor consumes later (no schema on Claude branch).

```ts
// CustomEvent type: "__easysubmit_field_capture__" (detail = FieldCapturePayload)
{
  type: "__easysubmit_field_capture__",
  tenantHost: string,
  stepFingerprint: string,
  fields: FieldDescriptor[],  // per APPLICATION_FIELD_MEMORY.md
  answers: Array<{ fieldSignature: string, answer: StoredAnswer, source: "user" | "autofill_accepted" | "user_corrected" }>
}
```

**Cursor bridge:** `setupFieldCaptureBridge` in content script → `CAPTURE_APPLICATION_ANSWERS` → `POST /api/extension/application-answers/capture`.

**Recommendation for Claude:** put `FieldDescriptor` + `StoredAnswer` types in `src/shared/extension/field-descriptor.ts` (shared module) so Cursor API can import the same shapes without touching `workday-autofill.ts`.

Denylist before fill: SSN, password, bank — per `APPLICATION_FIELD_MEMORY.md`.

---

## Current owners

| Agent | Branch (suggested) | Owns | Do not touch |
|-------|------------------|------|--------------|
| **Claude** | `claude/workday-autofill-phase-c` (merged) | Workday autofill — maintenance only | Field Memory schema/API on `cursor/field-memory` |
| **Cursor** | `cursor/field-memory` | Field Memory schema + capture API + extension bridge | `workday-autofill.ts` without coordination |

**Human merges one branch at a time.** Rebase the other agent before starting overlapping paths.

---

## Shipped on `main` (do not redo)

| Commit | Summary |
|--------|---------|
| `643d8a6` | Extension detection v2 (`page-classifier`, CVS hub fix, Phase 1 adapters, `extension:detect-eval`) + `app_config.resumeProfiles` cap (20) |
| `90ada2b` | JD Brain (`lib/job-tracker/jd/*`), `jdIntelligence` on `job_tracker_entries`, Job Tracker refresh, JSON-LD scrape fields, `shadow-dom` + `api-intercept` scaffolding |

---

## In flight

| Topic | Status | Doc |
|-------|--------|-----|
| Workday Phase C autofill (real fill) | **Merged on `main`** | `WORKDAY_ONE_CLICK_APPLY.md` |
| Application Field Memory (learn + DB) | **Cursor — capture API + bridge** | `APPLICATION_FIELD_MEMORY.md` |
| Application Profile (work auth, address, EEO) | Not started | `APPLICATION_FIELD_MEMORY.md` § Application Profile |

---

## Conflict rules

1. **Schema:** Only one agent adds Prisma models per PR. Field Memory tables → Cursor branch. JD Brain columns → already on `main`.
2. **`extension/src/content/index.ts`:** Claude owns until Workday fill loop lands; then coordinate before Cursor touches it.
3. **Docs:** Update the doc for your lane in the same PR as code.

---

## Session checklist

- [ ] Read `git log -5 --oneline`
- [ ] Read this file
- [ ] Confirm branch name
- [ ] Update this file when ownership changes
