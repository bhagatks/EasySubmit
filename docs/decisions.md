# Product & engineering decisions

Authoritative record of deliberate scope calls. When docs elsewhere conflict with a row here, **this file wins**.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-27 | **One-click apply deferred to v2/v3** — no Workday (or any platform) auto-pipeline that captures → tailors → autofills in one CTA for v1 | v1 prod scope: save jobs, tailor in dashboard/card, user submits manually. Full autofill / one-click apply is **v2/v3 only** — always list at the **end** of action trackers and keep **low priority** until v1 is stable. Existing `autoApplyUserSwitch`, `extension_auto_apply`, and `POST /api/extension/jobs/pipeline` one-click paths are **legacy / do not extend**. Remove Settings toggle in a future cleanup pass (popup toggle already removed). |
| 2026-06-27 | Extension popup v1 redesign — launcher only (connect, show card, open tracker) | Real workflow lives on the in-page card + dashboard; popup is not a second settings surface. |

## v1 scope (now)

- **Save to tracker** from supported job sites (extension card).
- **Review / tailor / enhance** in Job Tracker and Review Screen.
- **Apply assist** where scoped in v1 (field memory, keyword gap overlay) — user still submits manually.

## v2/v3 backlog (one-click apply & platform autofill)

Deferred — **do not prioritize above v1 deploy, extension reliability, or enhance quality.** When tracked in docs, place **last** (e.g. bottom of `ACTION_ITEMS.md`).

- Platform autofill (Workday first, then Tier 1 ATS).
- One-click / auto-pipeline (capture → tailor → autofill in one CTA).
- Answer vault wired into autofill field-fill loops.
- Historical spec: [`WORKDAY_ONE_CLICK_APPLY.md`](./WORKDAY_ONE_CLICK_APPLY.md).

## Legacy code (do not expand)

| Area | Notes |
|------|--------|
| `users.autoApplyUserSwitch` | DB column + Settings toggle — deprecate in UI; do not promote in marketing |
| `feature_flags.extension_auto_apply` | Keep for kill-switch only; default off in prod when cleaned up |
| `POST /api/extension/jobs/pipeline` | May remain for internal/dev; not v1 user-facing flow |
| `docs/WORKDAY_ONE_CLICK_APPLY.md` | Historical spec — **v2/v3 backlog** |
