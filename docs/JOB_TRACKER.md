# Job Tracker & Chrome Extension — Status

Last updated: **2026-07-05** (reconciled with `PROJECT_STATE.md`, `decisions.md`, code on `main`)

**Screen inventory:** [`SCREENS.md`](./SCREENS.md) · **Open work:** [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) · **v1 scope:** [`decisions.md`](./decisions.md)

---

## Done

### Web app (Job Tracker)

- `JobTrackerEntry` table + pipeline statuses (`CAPTURED` → `APPLIED`, …)
- `/dashboard/job-tracker` — pipeline rows (Kanban **removed**); bulk select + archive; manual **Add job** / paste JD
- **Review Screen** — tabs **Job | Resume | Cover | ATS** (Apply tab **removed**); Resume toolbar: Studio, Enhance, PDF, Word; Cover: edit, enhance, export
- Archive, auto-archive (24h), delete, **Retry optimize** on stuck `CAPTURED`
- Job-centric tailor on `job_resume_tailors`; base profiles at `/dashboard/resume-profiles`
- Realtime + poll sync — [`SYNC_ARCHITECTURE.md`](./SYNC_ARCHITECTURE.md)

### Extension API

| Route | Method | Notes |
|-------|--------|-------|
| `/api/extension/auth/token` | POST | Bridge page |
| `/api/extension/jobs` | GET/POST | Lookup / save → `CAPTURED` |
| `/api/extension/jobs/[id]` | PATCH | Status updates |
| `/api/extension/jobs/pipeline` | POST | **Legacy** — internal/dev; not v1 one-click CTA |
| `/api/extension/jobs/[id]/keyword-gap` | GET | Keyword gap for card overlay |
| `/api/extension/jobs/[id]/enhance` | POST | Manual card enhance |
| `/api/extension/application-answers` | GET | Field memory lookup |
| `/api/extension/application-answers/capture` | POST | Field memory capture |
| `/api/extension/user-prefs` | PATCH | Prefs + `applicationProfile` |
| `/api/extension/config` | GET | Runtime config |

### Chrome extension

- MV3 — `extension/` + `src/shared/extension/`; builds: [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md)
- **Popup (v1 launcher)** — connect account, tab status, job stats, show card, force-upgrade gate — [`EXTENSION_POPUP_REDESIGN.md`](./EXTENSION_POPUP_REDESIGN.md) Part 2 **done**
- **Force capture (Part 1)** — inject `content.js` on miss; `forceShowCard()` manual launch; `Add manually` on `no_job` — **partial** (UX polish open)
- In-page card (Shadow DOM), journey states 0–4, pipeline tailor, keyword gap chips on `READY_TO_APPLY`
- Site adapters: LinkedIn, Indeed, Greenhouse, Workday, Tier 1 + Phase 2 platforms — [`EXTENSION_DETECTION.md`](./EXTENSION_DETECTION.md)
- API intercept + shadow DOM + answer vault booted in content script

### Config & flags

- `app_config.extensionSites`, `forceUpgrade`, `extensionInstallPrompt`, `resumeProfiles.maxProfilesPerCustomer`
- `feature_flags.extension_global_switch` (kill-switch)
- `feature_flags.extension_auto_apply` — **legacy**; do not extend (`decisions.md`)

---

## Pending (v1)

| Item | Status | Notes |
|------|--------|-------|
| E2E job + extension flows | **Todo** | `ACTION_ITEMS.md` § Job E2E |
| Enhance QA sign-off | **Blocked** | System pool health |
| Chrome Web Store publish | **Blocked** | Listing under review |
| Extension Part 1 UX polish | **Partial** | `EXTENSION_POPUP_REDESIGN.md` §1.3–1.4 |
| Remove legacy one-click Settings toggle | **Todo** | `autoApplyUserSwitch` — `decisions.md` |
| Field Memory Settings UI | **Not started** | `APPLICATION_FIELD_MEMORY.md` |

---

## Deferred (v2/v3 — per `decisions.md`)

Do **not** prioritize above v1 deploy, extension reliability, or enhance QA.

| Item | Notes |
|------|-------|
| One-click apply / auto-pipeline CTA | Cancelled for v1 — [`WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md) historical |
| Platform autofill (all ATS) | Scrapers done; autofill pending |
| Workday wizard autofill as v1 product | Engine exists (`workday-autofill.ts`); off v1 user path |

---

## Local setup (extension)

```bash
run easy                                    # web + extension build
npx prisma migrate dev && npm run db:seed   # once
npm run build:extension                     # dist/extension-dev/
# chrome://extensions → Load unpacked → dist/extension-dev
# Connect: signed-in /dashboard or /extension/bridge?extensionId=<id>
```

Force-show card: toolbar icon → **Show job card on this page** (or context menu).

### Saved job not on dashboard?

1. Reconnect via `/extension/bridge?extensionId=<id>` on the **same host** as the dashboard.
2. Reload extension + job page; save again.
3. Read red error on card (auth, flag, network).

---

## Architecture

```
Job page → content.js (detect + card)
              ↕ chrome.runtime.sendMessage
         background.js (token + fetch)
              ↕ HTTPS + Bearer
         /api/extension/* → job_tracker_entries
              ↕ Realtime / poll
         /dashboard/job-tracker → Review Screen
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`PROJECT_STATE.md`](./PROJECT_STATE.md) | Canonical shipped features |
| [`SYNC_ARCHITECTURE.md`](./SYNC_ARCHITECTURE.md) | Extension ↔ app journey sync |
| [`APPLICATION_PROFILE.md`](./APPLICATION_PROFILE.md) | First-apply setup screens |
| [`APPLICATION_FIELD_MEMORY.md`](./APPLICATION_FIELD_MEMORY.md) | Learned answers |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Vercel + extension CI |
