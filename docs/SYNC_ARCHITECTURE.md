# EasySubmit — Extension + App Sync Architecture

> Status: **Implemented** (2026-06-23)
> Last updated: 2026-06-23

Canonical journey + sync spec. Complements [`EXTENSION_DETECTION.md`](./EXTENSION_DETECTION.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Journey lifecycle

| Stage | DB | Extension | App |
|-------|-----|-----------|-----|
| **0 — Detected** | *(no row)* | Apply (gated by URL + JD) | Hidden |
| **0c — Manual capture** | *(no row)* | URL + description form | Hidden |
| **1 — Preparing** | `CAPTURED` | Optimizing resume… | Row appears |
| **2 — Apply assist** | `READY_TO_APPLY` | Resume + assist two-card | Apply assist + Apply |
| **3 — Applied** | `APPLIED` | Completed | Completed badge |

Display mapper: `resolveJourneyDisplay()` in `src/shared/journey-display.ts`.

---

## Apply pipeline

```
Apply click → POST /api/extension/jobs/pipeline
  → save (CAPTURED)
  → runPipelineTailor
  → server READY_TO_APPLY
  → optional Workday autofill assist (pendingPhase: autofill)
```

Layer B gate: `canApplyCapture()` — URL + description ≥ 120 chars. Title derived via `resolveJobIdentity()`.

---

## Sync

| Surface | Mechanism |
|---------|-----------|
| App dashboard | `useJobTrackerSync` — Supabase Realtime + 10s poll fallback |
| Extension (pipeline) | Per-job Supabase Realtime push via `startJobStatusRealtime` — no polling |
| Extension (journey) | User-level Realtime via `startExtensionJobRealtime` + 2s poll during apply assist |
| Token APIs | `/api/job-tracker/realtime-token`, `/api/extension/realtime-token` |

**Pipeline sync flow (2026-06-25):** Extension calls `/capture` → gets `{id}` instantly → subscribes `subscribeJobStatusRealtime(jobId)` → fires `/tailor` async. Server writes `RESUME_READY` then `READY_TO_APPLY` to DB → Realtime pushes each to extension + dashboard simultaneously. No polling in capture→tailor flow.

Requires `SUPABASE_JWT_SECRET`, Realtime publication on `job_tracker_entries`, RLS `userId = auth.jwt() ->> 'sub'`.

---

## Stage 2 — Apply Assist

### Extension — two-card layout

**Top card (Resume card)** — static after generation:
- Shows which resume/profile was used
- "Review" button → opens app `ReviewScreen` for this `jobId`
- Does not change as user moves through form steps

**Bottom card (Assist card)** — live and dynamic:
- Reads current page form fields via Field Memory resolution ladder (see `APPLICATION_FIELD_MEMORY.md` + `APPLICATION_PROFILE.md`)
- **Auto-fills silently** — no copy/insert, no prompts. Confidence ≥ 0.85 → auto-fill; 0.6–0.85 → pre-fill + highlight
- Resolution order: Field Memory → vault (interim) → application profile → resume map → template → AI (BYOK only) → blank + icon
- Blank fields shown with visual warning icon only — no text prompt, no modal
- Updates on every ATS form step navigation (multi-page flows re-run field detection)
- "Mark as Applied" button always visible as manual fallback
- Multi-tab: same `jobId` open in two tabs syncs silently to DB state — no conflict UI

### App — tracker card (Stage 2)

| Condition | What app shows |
|-----------|---------------|
| Extension active on job page | "Apply Assist active" + live field progress |
| Extension not on job page | "Continue on job page" prompt |
| Extension not installed | Install prompt — do not silently open URL |

- **Apply button:** opens/focuses job URL with `?es_open=assist`; content script auto-expands card on load
- **Review link:** opens `ReviewScreen` for this job (same as extension Resume card)
- **Mark as Applied:** always visible — manual fallback in case confirmation detection misses
- App reflects assist progress in real time via Realtime/poll — field count or step shown if available

---

## Applied transition

- Auto: `detectApplicationConfirmation()` → `MARK_APPLIED` → `POST .../mark-applied`
- Manual: extension card or dashboard **Mark applied**
- Idempotent: `markJobTrackerApplied()`

---

## Delete / reset (Stage → 0)

When a row is **deleted** from the Job Tracker dashboard:

| Surface | Expected behavior |
|---------|-------------------|
| **App** | Row removed immediately (server action + Realtime/poll) |
| **Extension** | Within one sync tick: `saved:false`, clear pipeline/`saveError`, card returns to **Apply** (Stage 0) |

Sync paths: Supabase Realtime `DELETE`, extension journey poll (3s while saved), tab focus/visibility refresh.

Structured logs: prefix `[EasySubmit:Sync]` — enable verbose dashboard logs with `localStorage.easysubmit_sync_debug = "1"`.

URL lookup for status always uses **canonical URL** (strips `source`, `utm_*`, `gh_src`, etc.) so Workday reposts with `?source=LinkedIn` still match the saved row.

---

## App → extension deep link

- `appendAssistOpenParam(url)` adds `?es_open=assist`
- Content script `handleAssistOpenOnLoad()` expands card
- Fallback: `START_APPLY` message when extension ID known

---

## File map

| Module | Path |
|--------|------|
| Apply gate | `src/shared/extension/apply-gate.ts` |
| Identity resolver | `src/shared/extension/job-identity.ts` |
| Save normalization | `lib/extension/normalize-save-job.ts` |
| Mark applied | `lib/extension/mark-applied.ts` |
| Confirmation detect | `src/shared/extension/confirmation-detect.ts` |
| Assist open URL | `src/shared/extension/assist-open-url.ts` |
| Card UI (manual + assist) | `extension/src/content/card-ui.ts` |
| Card resolve | `extension/src/content/resolve-card-content.ts` |
| Extension realtime | `extension/src/content/job-realtime.ts` |

---

## Confirmation detection (Stage 2 → 3)

Auto-detect fires when **2 of 3** signals are true on any navigation event during Stage 2:

1. URL matches a known terminal pattern for the platform
2. Page contains confirmation text ("application submitted", "thank you for applying", "we received your application")
3. No submit-type form inputs visible in main content area

Only fires when current journey is in `READY_TO_APPLY`. Ignored if already `APPLIED`.

---

## Re-apply

When user revisits a job URL with no active journey (all rows archived/applied):
- Extension shows **"Re-apply"** button
- Re-apply archives the existing `APPLIED` row, creates a fresh `JobTrackerEntry` with same job metadata
- `@@unique([userId, urlHash])` constraint removed — multiple rows per URL allowed
- Active journey = most recent non-archived row for `userId + urlHash`
- All rows kept — application history preserved

| URL revisit scenario | Extension | App |
|----------------------|-----------|-----|
| No rows | Apply (Stage 0) | Nothing |
| Active row exists | Resume that stage | Show active entry |
| No active row, archived rows exist | Re-apply button | Archived entries shown |

---

## Polling intervals (adaptive)

| Surface | Stage | Interval |
|---------|-------|----------|
| Extension content script | Stage 2 active | 3s |
| Extension content script | Stage 1 generating | 5s |
| Extension content script | Idle / terminal | Off |
| App dashboard | Any active journey | 3s |
| App dashboard | All terminal / idle | 30s |

Realtime push resets poll timer on receipt.

---

## Decisions log

| Decision | Choice |
|----------|--------|
| Multiple rows per URL | Allowed — `@@unique` removed; active = most recent non-archived |
| Re-apply tap | Straight to fresh Apply flow — no review of archived entry |
| History in app | Duplicate entries shown as-is (V1) — same job may appear multiple times |
| Confirmation detection | 2-of-3 signals |
| Poll intervals | Adaptive per stage (see table above) |
| Extension Realtime V1 | Token endpoint from day one |
| ATS confirmation patterns | Start with supported platforms; extensible config |
| Schema migration | First migration before other work — everything depends on it |

---

## Deferred

- Full per-adapter autofill assist beyond Workday
