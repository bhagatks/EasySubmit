# Active work — agent coordination

**Update this file before each Cursor or Claude session.**  
Both agents should read it first. Only one agent should edit a given path at a time.

Last updated: **2026-06-22** (Claude active on `claude/workday-autofill-phase-c`)

---

## Claude Phase C — in progress (confirmed plan)

Branch: `claude/workday-autofill-phase-c` (latest: `dd27044` API intercept wired)

| # | Deliverable | Spec alignment |
|---|-------------|----------------|
| 1 | `workday-autofill.ts` — shadow DOM scan, fill text/select/radio/checkbox, synthetic events | `APPLICATION_FIELD_MEMORY.md` § FieldDescriptor |
| 2 | Multi-step runner — step detect, Continue, MutationObserver, stop at CAPTCHA | `WORKDAY_ONE_CLICK_APPLY.md` Phase C5/C7 |
| 3 | `answer-vault` get before fill, set on step continue | Interim until server Field Memory |
| 4 | `captureStepFields()` → postMessage FieldDescriptors | See **Integration contract** below |
| 5 | `content/index.ts` — swap stub import only; denylist before fill | Claude owns this file until merge |

**Cursor waits** until Claude merges Phase C before: Prisma `user_application_answers`, capture API, Settings UI.

---

## Integration contract (Claude → Cursor)

Claude emits; Cursor consumes later (no schema on Claude branch).

```ts
// postMessage type: "__easysubmit_field_capture__"
{
  type: "__easysubmit_field_capture__",
  tenantHost: string,
  stepFingerprint: string,
  fields: FieldDescriptor[],  // per APPLICATION_FIELD_MEMORY.md
  answers: Array<{ fieldSignature: string, answer: StoredAnswer, source: "user" | "autofill_accepted" | "user_corrected" }>
}
```

**Recommendation for Claude:** put `FieldDescriptor` + `StoredAnswer` types in `src/shared/extension/field-descriptor.ts` (shared module) so Cursor API can import the same shapes without touching `workday-autofill.ts`.

Denylist before fill: SSN, password, bank — per `APPLICATION_FIELD_MEMORY.md`.

---

## Current owners

| Agent | Branch (suggested) | Owns | Do not touch |
|-------|------------------|------|--------------|
| **Claude** | `claude/workday-autofill-phase-c` | Workday autofill fill loop, `workday-autofill*`, `extension/src/content/index.ts`, wire `answer-vault.ts` locally, `api-intercept` / `shadow-dom` integration | `page-classifier.ts`, `resume-profiles-config`, detection tests (shipped in `643d8a6`) |
| **Cursor** | `cursor/field-memory` | Field Memory **spec + schema + API** per `APPLICATION_FIELD_MEMORY.md` | `content/index.ts`, `workday-autofill*` while Claude is active |

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
| Workday Phase C autofill (real fill) | **Claude — coding now** | `WORKDAY_ONE_CLICK_APPLY.md` |
| Application Field Memory (learn + DB) | Cursor — **spec only** | `APPLICATION_FIELD_MEMORY.md` |
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
