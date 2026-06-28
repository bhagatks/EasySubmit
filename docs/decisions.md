# Product & engineering decisions

Authoritative record of deliberate scope calls. When docs elsewhere conflict with a row here, **this file wins**.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-27 | **One-click apply will not ship** — no Workday (or any platform) auto-pipeline that captures → tailors → autofills in one CTA | v1 prod scope: save jobs, tailor in dashboard/card, user submits manually. Existing `autoApplyUserSwitch`, `extension_auto_apply`, popup toggle, and `POST /api/extension/jobs/pipeline` one-click paths are **legacy / do not extend**. Remove from extension popup and Settings in a future cleanup pass. |
| 2026-06-27 | Extension popup v1 redesign — launcher only (connect, show card, open tracker) | Real workflow lives on the in-page card + dashboard; popup is not a second settings surface. |

## One-click apply — what we are building instead

- **Save to tracker** from supported job sites (extension card).
- **Review / tailor / enhance** in Job Tracker and Review Screen.
- **Apply assist** only where explicitly scoped later (field memory, keyword gap) — not a marketed “one-click apply” product.

## Legacy code (do not expand)

| Area | Notes |
|------|--------|
| `users.autoApplyUserSwitch` | DB column + Settings toggle — deprecate in UI; do not promote in marketing |
| `feature_flags.extension_auto_apply` | Keep for kill-switch only; default off in prod when cleaned up |
| `POST /api/extension/jobs/pipeline` | May remain for internal/dev; not v1 user-facing flow |
| `docs/WORKDAY_ONE_CLICK_APPLY.md` | Historical spec — **cancelled** |
