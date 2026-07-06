# Active work — agent coordination

**Update this file before each Cursor or Claude session.**  
Both agents should read it first. Only one agent should edit a given path at a time.

Last updated: **2026-07-06**

**Canonical status:** [`PROJECT_STATE.md`](./PROJECT_STATE.md) (shipped) · [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) (open QA, deploy, backlog)

---

## Current focus (v1 finish line)

| Priority | Lane | Status | Doc |
|----------|------|--------|-----|
| P0 | Enhance QA sign-off (Case 001) | **Done** | Manual A/B/C pass at `/dashboard/testing-resume` |
| P0 | Prod closeout (RLS migrate, `ONET_API_KEY`, legacy `aiConfig` row) | **Pending** | `PROD_CUTOVER.md` |
| P0 | Chrome Web Store publish | **Blocked** | listing under review |
| P1 | Resume + Job E2E smoke (all **Todo** in tracker) | **Not started** | `ACTION_ITEMS.md` § E2E |
| P1 | Extension keyword-gap chip UI | **Done** | `renderKeywordGapRow` in `card-ui.ts` |
| P1 | Extension force-capture UX polish (3.2) | **Done** | `no_job` → Add manually; loading hint; manual header copy |
| P1 | Remove legacy one-click Settings toggle (3.3) | **Done** | `AccountSettings.tsx` — DB column retained for ops |
| P2 | Field Memory Settings UI (list/edit answers) | **Done** | Settings → Application answers; `app/actions/application-answers.ts` |
| v2/v3 | Platform autofill (Workday engine exists; not v1 scope) | **Deferred** | `decisions.md` |

---

## Shipped on `main` (do not redo)

Reconciled **2026-07-05** — verify with `git log` before re-implementing.

| Area | Evidence |
|------|----------|
| North-star 3-phase enhance pipeline | `run-resume-enhance-pipeline.ts`; onboarding → `enhanceResumeOnboarding()` |
| JD Brain + JDSkillsFramework | `lib/job-tracker/jd/*`, `jd-skills-service.ts` |
| Extension popup Part 2 | `extension/src/popup/popup.ts` — `GET_JOB_STATS`, `GET_TAB_STATUS`, account chip, force-upgrade gate |
| Extension Part 1 (core) | `sendToActiveTab` injects `content.js`; `forceShowCard()` manual launch; `resolve-card-content.ts` manual path |
| API intercept boot | `injectApiInterceptScript()` + `onApiIntercept()` in `content/index.ts` |
| Field Memory — schema + API + bridge | `user_application_answers`, `application-answers/*`, `field-capture-bridge.ts` |
| Field Memory — Settings list/edit/delete | Settings → **Application answers**; `app/actions/application-answers.ts` |
| Field resolution ladder | `field-resolution.ts` → `workday-autofill.ts` (server + vault + `applicationProfile`) |
| Application Profile — extension setup | Screens 1–3 in content script; `PATCH /api/extension/user-prefs` |
| Keyword gap API + fetch + card UI | `GET_KEYWORD_GAP` on `READY_TO_APPLY`; chips via `renderKeywordGapRow` |
| Resume rules v2 | flag `resume_rules_v2`; `docs/resume/RULES-V2.md` |
| Job tracker pipeline UI + Review Screen | tabs: Job \| Resume \| Cover \| ATS (Apply tab removed) |

---

## In flight

| Topic | Owner | Status | Paths / notes |
|-------|-------|--------|----------------|
| Enhance QA — Case 001 A/B/C | Human | **Done** | Manual pass 2026-07-06 |
| E2E resume flows | QA | **Todo** | onboarding, profile upload, export |
| E2E job flows | QA | **Todo** | manual add, extension capture, Review |
| Keyword gap card UI | Dev | **Done** | `extension/src/content/card-ui.ts` `renderKeywordGapRow` |
| Force-capture UX polish (3.2) | Dev | **Done** | Add manually, Save to tracker, loading hint |
| Legacy one-click Settings toggle (3.3) | Dev | **Done** | Removed from Settings UI |
| Field Memory Settings | Dev | **Done** | Application answers section on `/dashboard/settings` |
| CWS publish | Human | **Blocked** | after listing approval |

---

## Deferred (v2/v3 — low priority per `decisions.md`)

- One-click apply / full Workday wizard autofill as v1 CTA
- Tier-1 ATS autofill adapters (scrapers done; autofill pending)
- Answer vault → full cross-platform autofill loops beyond Workday engine

**Note:** `workday-autofill.ts` is a real engine with field memory — product scope keeps it off the v1 user path.

---

## Conflict rules

1. **Schema:** One Prisma migration owner per PR.
2. **`extension/src/content/index.ts`:** High-churn — coordinate before parallel edits.
3. **Docs:** Update the tracker for your lane in the same PR as code (`PROJECT_STATE` for shipped, `ACTION_ITEMS` for open work).
4. **Source of truth:** If trackers disagree, prefer **code on `main`** then `PROJECT_STATE.md` then `decisions.md`.

---

## Session checklist

- [ ] `git log -5 --oneline`
- [ ] Read this file + `ACTION_ITEMS.md`
- [ ] Confirm branch name
- [ ] Update this file when ownership or reconciliation changes
