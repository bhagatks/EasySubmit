# Workday One-Click Apply — E2E Spec & Work Breakdown

Last updated: **2026-06-22**

Anchor ATS: **Workday** (`*.myworkdayjobs.com`). Other platforms stay **Save to Tracker** until autofill ships per platform.

---

## Product definition

**One-click apply** (user setting, default **on**): on a supported Workday job page, the extension primary CTA runs the full EasySubmit pipeline with no manual steps except the final submit on Workday.

| Phase | Action | Kanban status |
|-------|--------|---------------|
| 1 Capture | Scrape + save job metadata + JD | `CAPTURED` |
| 2 Tailor | Copy selected resume profile → job-specific profile → Enhance AI with scraped JD | `RESUME_READY` |
| 3 Autofill | Fill Workday apply form from tailored profile | `READY_TO_APPLY` |
| 4 Submit | User clicks Submit on Workday (not automated in v1) | `APPLIED` (manual or future detect) |

**Setting off:** CTA reverts to **Save to Tracker** → `CAPTURED` only (current behavior).

**Multi-job:** each job gets its own tracker row + `job_resume_tailors` overrides (merged with base profile at read time; default profile not mutated).

---

## Feature flag gate

| Flag | DB key | Default | When **off** |
|------|--------|---------|--------------|
| Extension auto apply | `extension_auto_apply` | `true` | Manual 3-step flow only (Save → Update resume → Apply). User `oneClickApply` setting ignored. |

Toggle in DB: `UPDATE feature_flags SET enabled = false WHERE key = 'extension_auto_apply';`

---

## Defaults (confirmed)

| Decision | Choice |
|----------|--------|
| Resume source | User picks on extension card (resume icon); stored as `sourceProfileId` on save/pipeline; Phase B tailors from that profile |
| Profile pre-select | Settings: **Default profile** vs **Last selected on extension card** (`users.resumeProfilePickerMode`); last pick in `chrome.storage` `easysubmit_selected_profile_id_v1` |
| AI quota | Block tailor if no route/quota; show error on card |
| Apply scope v1 | Autofill only — user submits manually |
| One-click scope v1 | **Workday only** |
| Concurrency v1 | One pipeline run at a time per tab |
| Setting default | `oneClickApply = true` for all users |

---

## Workday scraper — current vs needed

### Done today

| Item | Location |
|------|----------|
| Dedicated `workdayAdapter` | `src/shared/extension/site-adapters.ts` |
| URL title fallback (pre-SPA) | `src/shared/extension/workday-helpers.ts` |
| High-confidence detection | `detectWorkdayConfidence`, apply button selectors |
| Job posting URL pattern | `myworkdayjobs.com/.../job/...` |
| Apply-step URL in `isJobPage` | `is-job-page.test.ts` |
| Generic JD selectors include Workday automation ids | `scrape-helpers.ts` |

### Scraper work remaining

| # | Task | Priority | Notes |
|---|------|----------|-------|
| W1 | **Posting vs apply URL normalization** | P0 | **Done** — `canonicalizeJobUrl` strips `/apply` |
| W2 | **Company from hostname/subtitle** | P0 | **Partial** — `parseWorkdayCompanyFromUrl` skips locale segment |
| W3 | **Description on apply-step pages** | P0 | JD sometimes only on posting tab; fetch or warn |
| W4 | **Salary / compensation field** | P1 | `[data-automation-id='compensationText']` + fallbacks |
| W5 | **Locale path variants** | P1 | `/en-US/`, `/en-GB/` segment handling |
| W6 | **SPA hydration retry** | P1 | MutationObserver or delayed re-scrape (2–3s) |
| W7 | **Apply button deep-link** | P1 | Detect apply URL from posting page for autofill phase |
| W8 | **Unit tests with HTML fixtures** | P0 | Posting page, apply page, pre-hydration URL-only |
| W9 | **Live E2E checklist** | P0 | 3+ real Workday tenants (e.g. Walmart, CVS, random F500) |
| W10 | **Confidence tuning** | P2 | Avoid generic adapter winning over Workday on tenant sites |

---

## One-click apply — implementation work

### Phase A — Foundation

| # | Task | Status |
|---|------|--------|
| A1 | `users.oneClickApply` boolean default `true` | **Done** |
| A2 | Settings toggle + server action | **Done** |
| A3 | Extension config returns `oneClickApply` when authed | **Done** |
| A4 | `POST /api/extension/jobs/pipeline` orchestrator | **Done** — capture → tailor → `pendingPhase: autofill` |
| A5 | Extension CTA: Workday + one-click → **Apply with EasySubmit** | **Done** |
| A6 | Card progress states (Capturing / Tailoring / Ready) | **Partial** — `pipelineBusyLabel` on card; no background polling yet |
| A7 | `job_resume_tailors` per-job override table | **Done** |
| A8 | Extension card resume icon picker + `GET /api/extension/resume-profiles` | **Done** |
| A9 | Settings: default vs last-selected profile mode | **Done** |
| A10 | Save/pipeline passes `sourceProfileId` in job metadata | **Done** |

### Phase B — Tailor (Enhance AI)

| # | Task | Status |
|---|------|--------|
| B1 | `enhanceResumeForUserId()` — bearer-safe enhance (no session) | **Done** — `lib/ai/enhance-resume-for-user.ts` |
| B2 | Resolve source profile (no clone) | **Done** — `resolveSourceProfileForJob` |
| B3 | Run Enhance with scraped `description` as JD | **Done** — `runPipelineTailor` → `enhanceResumeForUserId` (`variant: pipeline`) |
| B4 | Persist section overrides to `job_resume_tailors` | **Done** — `extractJobResumeOverrides` + `upsertJobResumeTailor` |
| B5 | Update tracker → `RESUME_READY` | **Done** — status + `job_resume_tailors` row |
| B6 | Kanban + card reflect status without refresh | **Partial** — card busy label + error toast; tracker refreshes on tab focus |
| B7 | Error handling: stay `CAPTURED`, surface message | **Done** — clone deleted on failure; `metadata.pipelineError`; API `200` + `saved: true` |

### Phase C — Workday autofill

| # | Task | Status |
|---|------|--------|
| C1 | Port Workday apply engine from AutoApplyAI `src/apply/` | Pending |
| C2 | Content-script autofill runner (Shadow DOM safe) | **Partial** — `runAutofillPhase` in content script + `runWorkdayAutofillStub` |
| C3 | Map tailored profile → Workday field map | Pending |
| C4 | Navigate posting → apply if needed | **Partial** — stub clicks Workday apply button when present |
| C5 | Handle multi-page Workday wizard (Experience, EEO, etc.) | Pending |
| C6 | Update tracker → `READY_TO_APPLY` on fill complete | **Done (stub)** — `POST /api/extension/jobs/[id]/autofill-complete` |
| C7 | User attestation / CAPTCHA → stop, show “finish manually” | **Partial** — stub leaves submit to user; errors surfaced on card |

### Phase D — Multi-job & polish

| # | Task | Status |
|---|------|--------|
| D1 | Queue: prevent duplicate pipeline for same URL | **Partial** — skips re-tailor when entry already `RESUME_READY+` |
| D2 | Background job status polling on card | **Done** — interval polling during pipeline/autofill (`startStatusPolling`) |
| D3 | Dashboard link to job-specific tailored profile | **Done** — Review Screen + kanban **Studio** link on rows |
| D4 | Extension popup shows one-click setting shortcut | **Done** — popup toggle → `PATCH /api/extension/user-prefs` |
| D5 | Docs + ARCHITECTURE changelog | **Done** |

### Phase E — Replicate to other ATS (after Workday E2E)

Greenhouse → Lever → Ashby (easier forms first after Workday proven).

---

## API sketch

```
POST /api/extension/jobs/pipeline
Authorization: Bearer <extension-token>
Body: JobSavePayload (same as save)

Response (success):
{
  success: true,
  saved: true,
  id: "...",
  status: "RESUME_READY",
  phases: ["capture", "tailor"],
  pendingPhase: "autofill",
  hasTailoredResume: true,
  sourceProfileId: "..."
}

After autofill stub (extension → `POST /api/extension/jobs/:id/autofill-complete`):
{
  success: true,
  id: "...",
  status: "READY_TO_APPLY"
}

Response (tailor failed after capture):
{
  success: false,
  saved: true,
  id: "...",
  status: "CAPTURED",
  error: "...",
  code: "missing_description" | "no_source_profile" | "enhance_failed" | ...
}
```

---

## Extension UX sketch

| Condition | CTA label |
|-----------|-----------|
| Workday + oneClickApply + not saved | **Apply with EasySubmit** |
| Workday + oneClickApply + pipeline done to READY | **Open Tracker** |
| oneClickApply off or non-Workday | **Save to Tracker** |
| Already saved, one-click off | **Open Tracker** |

**Resume profile picker (card header):** document icon only — click opens profile list (default badge on default row). Selection persisted locally; save/pipeline sends `sourceProfileId`. **Update resume** manual step opens Studio for the selected profile.

---

## Kanban mapping

Automated status transitions (no manual drag required when one-click succeeds):

```
CAPTURED → RESUME_READY → READY_TO_APPLY → (user submits) → APPLIED
```

---

## Test plan

- [ ] Unit: Workday URL canonicalization (posting vs apply)
- [ ] Unit: scrape fixtures (posting + apply DOM)
- [ ] Unit: pipeline rejects non-Workday when one-click on
- [ ] Unit: pipeline respects `oneClickApply = false`
- [ ] Integration: save → enhance → profile copy → status update
- [ ] Manual: full Workday flow on localhost with extension loaded
- [ ] `npm test` + `npm run build`

---

## Related docs

- [`JOB_TRACKER.md`](./JOB_TRACKER.md) — tracker + extension status
- [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) — checklist rows
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — changelog
