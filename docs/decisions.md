# Product & engineering decisions

Authoritative record of deliberate scope calls. When docs elsewhere conflict with a row here, **this file wins**.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-06 | **Chrome Web Store publish — live** | Listing approved; public install at `ondcaafebdfegfkmdggeklofnmbijmlc`. CI publish via manual workflow + `publish_to_cws`. |
| 2026-07-06 | **Chrome Web Store publish deferred to v2** | ~~v1 ships web dashboard + dev/sideload extension~~ — **superseded** by CWS approval same day. |
| 2026-07-06 | **Paid subscriptions / billing launch deferred to v2** | Pricing page, plan copy, and upgrade nudge UI ship in v1; live paid subscribe CTAs and billing go-live wait until v2. |
| 2026-06-27 | **One-click apply deferred to v2/v3** — no Workday (or any platform) auto-pipeline that captures → tailors → autofills in one CTA for v1 | v1 prod scope: save jobs, tailor in dashboard/card, user submits manually. Full autofill / one-click apply is **v2/v3 only** — always list at the **end** of action trackers and keep **low priority** until v1 is stable. Existing `autoApplyUserSwitch`, `extension_auto_apply`, and `POST /api/extension/jobs/pipeline` one-click paths are **legacy / do not extend**. Remove Settings toggle in a future cleanup pass (popup toggle already removed). |
| 2026-06-27 | Extension popup v1 redesign — launcher only (connect, show card, open tracker) | Real workflow lives on the in-page card + dashboard; popup is not a second settings surface. |

## v1 scope (now)

- **Save to tracker** from supported job sites (extension card).
- **Review / tailor / enhance** in Job Tracker and Review Screen.
- **Apply assist** where scoped in v1 (field memory, keyword gap overlay) — user still submits manually.
- **Web dashboard** at `www.easysubmit.ai` — primary v1 surface.
- **Chrome Web Store extension** — public install from listing `ondcaafebdfegfkmdggeklofnmbijmlc`.

## v2 backlog (do not prioritize above v1 deploy, enhance quality, or core job/resume E2E)

Deferred — place **last** in action trackers (e.g. bottom of `ACTION_ITEMS.md`).

### Distribution & monetization (v2)

- ~~**Chrome Web Store publish**~~ — **Done** (2026-07-06).
- **Paid subscriptions go-live** — flip `subscriptions.enabled`, live Stripe/billing CTAs beyond marketing copy.

### Platform autofill & one-click apply (v2/v3)

- Platform autofill (Workday first, then Tier 1 ATS) — scrapers remain v1; **autofill adapters are v2**.
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
