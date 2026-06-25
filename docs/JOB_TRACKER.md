# Job Tracker & Chrome Extension — Status

Last updated: **2026-06-22**

---

## Done

### Web app (Job Tracker)
- `JobTrackerEntry` table + pipeline statuses (`CAPTURED` → `APPLIED`, …)
- `/dashboard/job-tracker` **pipeline tracker** — clickable rows open Review Screen; left-aligned **role · company** single line (truncate) + 4-segment animated progress bar; top-right **Archive · Delete · Issue** then **Review** + pulsing **Apply** when ready; refreshes from DB on tab focus
- **Review Screen** — large job title (matches dashboard page titles), **Close** top-right, **Status** row below subtitle; tabs **Job | Resume | Cover | Apply**; Resume tab: merged **PrimeResume** preview, tailored-section pills, toolbar **Studio Edit | Enhance with AI | PDF | Word | LaTeX** (Studio opens `/dashboard/job-tracker/[id]/resume`); Cover tab: full-bleed letter preview, inline **Edit**, **Enhance with AI** (quota + BYOK), PDF/Word/LaTeX export; pipeline tailor seeds template cover draft on `job_resume_tailors`; LaTeX v1 validates `\begin{document}` and shows HTML model preview (no TeX engine); `?job={id}&panel={tab}`
- **Archive** — header button toggles active/archive; auto-archive applied jobs after 24h (Settings toggle); **Archive** icon on every active row
- **Delete** — permanent delete with confirmation on every row
- Job-centric model: tailor/cover/export fields live on the job row (`metadata`, `job_resume_tailors` overrides); base profiles stay at `/dashboard/resume-profiles`
- `scripts/sql/clean-legacy-job-data.sql` for fresh start

### Extension API
| Route | Method | Auth |
|-------|--------|------|
| `/api/extension/auth/token` | POST | NextAuth session (bridge page) |
| `/api/extension/jobs?url=` | GET | Bearer extension token |
| `/api/extension/jobs` | POST | Bearer — save job → `CAPTURED` |
| `/api/extension/jobs/[id]` | PATCH | Bearer — update status |
| `/api/extension/jobs/pipeline` | POST | Bearer — capture + tailor → autofill stub → `READY_TO_APPLY` |
| `/api/extension/jobs/[id]/autofill-complete` | POST | Bearer — mark autofill complete (stub or real) |
| `/api/extension/user-prefs` | PATCH | Bearer — update `autoApplyUserSwitch` from popup |
| `/api/extension/config` | GET | Public runtime config |

### Auth bridge
- `/extension/bridge?extensionId=<id>` — issues token, sends to extension via `externally_connectable`

### Chrome extension (v0.1.1)
- Source: `extension/` + shared logic `src/shared/extension/`
- Build: `npm run build:extension` → `dist/extension/` (icons rasterized from `extension/icons/icon.svg`)
- **Toolbar popup** — click the extension icon → **Show job card on this page**
- **Context menu** — right-click the extension icon → **Show job card on this page** (forces card even when auto-detect fails)
- In-page job card (Shadow DOM): **EasySubmit.ai** header, draggable grip; Workday one-click → **Apply with EasySubmit** runs capture → tailor (`pipelineBusyLabel`); manual flow → **Save to Tracker**; **Stage 1 animated nudge** below the card
- Site adapters: LinkedIn, Indeed, Greenhouse, Workday, generic fallback
- Background: config cache, auth token storage, API client

### Config & flags
- `app_config.extensionSites` (seeded)
- `feature_flags.extension_global_switch` (seeded, default on — off = extension inactive platform-wide)
- `feature_flags.extension_auto_apply` (seeded, default on — off = manual 3-step apply flow)

---

## Pending

| Item | Notes |
|------|-------|
| **Run migrations** | `npx prisma migrate dev` on your DB |
| **Kanban dashboard UI** | Removed — pipeline row UI |
| **Status automation** | Tailor → `RESUME_READY` and autofill stub → `READY_TO_APPLY` **done**; real Workday field fill pending |
| **Autofill pipeline** | Stub in `runWorkdayAutofillStub` + `completePipelineAutofill`; port full engine from AutoApplyAI `src/apply/` |
| **Tailor + cover + Job Fit** | Resume tab **done**; Cover tab **done** (preview, edit, AI enhance, export, LaTeX); Job Fit tab pending |
| **Export (temp + cleanup)** | Phase F — on-demand from overlay only |
| **More adapters** | Lever, Ashby, iCIMS, … |
| **Production `externally_connectable`** | Add your Vercel domain to manifest |

---

## Local setup (extension)

```bash
# 1. Web app
run easy

# 2. Migrations + seed (once)
npx prisma migrate dev
npm run db:seed   # or prisma db seed

# 3. Build extension (also runs automatically via `run easy`)
npm run build:extension

# 4. Chrome
# chrome://extensions → Developer mode → Load unpacked → dist/extension

# 5. Connect account
# Open any job page → Save → Sign in flow, or visit:
# http://localhost:3000/extension/bridge?extensionId=<your-extension-id>

# 6. Force-show card on stubborn pages (Workday, etc.)
# Click the EasySubmit toolbar icon → Show job card on this page
# Or right-click the icon → Show job card on this page
```

Extension ID: shown on `chrome://extensions` under the EasySubmit card.

### Saved job not on dashboard?

1. **Reconnect the extension** — open `/extension/bridge?extensionId=<id>` while signed in on the **same host** you use for the dashboard (e.g. `http://localhost:3000`). This pins auth + API base URL.
2. **Reload the extension** at `chrome://extensions`, refresh the job page, save again.
3. If the card shows a red error, read the message (auth, feature flag, or network).

The extension always saves to the API host it last connected through — not necessarily `NEXT_PUBLIC_APP_URL`.

---

## Architecture

```
Job page → content.js (detect + card)
              ↕ chrome.runtime.sendMessage
         background.js (token + fetch)
              ↕ HTTPS + Bearer
         /api/extension/* → job_tracker_entries
              ↕
         /dashboard/job-tracker
```

---

## AutoApplyAI reuse

Ported: job detection heuristics, platform URL patterns, scrape selectors.  
Not ported: Side Panel, Firebase, autofill (v2).
