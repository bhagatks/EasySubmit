# Analytics — Option A (PostHog + Postgres AI logs + Pino)

Product analytics for EasySubmit using **PostHog** (events, replay, errors) plus existing **`api_call_logs`** for AI ops. Structured server logs via **Pino** (pretty in dev, JSON in prod).

## PostHog projects

| Environment | Project ID | Where to set key |
|-------------|------------|------------------|
| **Dev** | `488025` | `.env.local` → `NEXT_PUBLIC_POSTHOG_KEY` |
| **Prod** | `488042` | Vercel Production env |
| **Host** | US Cloud | `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` |

Never commit real `phc_` tokens. Placeholders only in `.env.example`.

## Environment variables

```bash
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ENV=dev          # dev | prod
NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS=   # optional comma-separated user ids
NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true   # web only; extension build forces false

LOG_LEVEL=debug                        # dev; info in prod

# One-time dashboard bootstrap (local only, gitignored)
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_DEV_PROJECT_ID=488025
POSTHOG_PROD_PROJECT_ID=488042
```

**Vercel Preview** deployments should use the **dev** PostHog key and `NEXT_PUBLIC_ANALYTICS_ENV=dev`.

**Extension builds** inline `NEXT_PUBLIC_*` at `npm run build:extension` (reads `.env.local`). Use dev key for unpacked dev; prod key before Chrome Web Store publish.

## Code layout

| Path | Role |
|------|------|
| `src/shared/analytics/` | Event catalog, sanitize, PostHog browser client |
| `src/shared/analytics/product-events.ts` | Typed helpers (enhance, BYOK) |
| `components/providers/analytics-*.tsx` | Provider, pageviews, identify, errors |
| `lib/logger.ts` | Pino (dev pretty / prod JSON) |
| `scripts/posthog-setup-dashboards.mjs` | Creates PostHog dashboards via API |

## Event catalog

All events include `environment` (`dev`|`prod`) and `internal` (bool). **`identify(userId)` only** — no email, name, or resume text.

### Auth
- `login_started` — `{ provider }`
- `login_completed` — `{ provider, is_new_user }` (once per browser session)

### Onboarding (Identity → Import → Studio)
- `onboarding_phase_viewed` — `{ phase, phase_code }`
- `onboarding_phase_completed` — `{ phase, phase_code, duration_ms }`
- `onboarding_completed` — `{ duration_ms }`
- `onboarding_enhance_completed` — `{ status, duration_ms }`

### Review Screen
- `review_screen_opened` — `{ entry_id, entry_status }`
- `review_tab_changed` — `{ tab }`

### Enhance
- `enhance_clicked` — `{ surface, document_kind, ai_enabled }`
- `enhance_completed` — `{ surface, document_kind, status, trace_id?, duration_ms, error_code? }`

Surfaces: `review_resume`, `review_cover`, `onboarding_studio`, `dashboard_studio`, `job_studio`, `extension`

### Extension
- `extension_card_opened` / `extension_card_collapsed`
- `extension_popup_opened` / `extension_popup_show_card`
- `extension_job_captured` — `{ platform, entry_id, status }`
- `extension_apply_started` — `{ platform }`
- `extension_autofill_started` / `extension_autofill_completed`

### BYOK
- `byok_cta_clicked` — `{ source }`
- `byok_handshake_started` / `byok_handshake_succeeded` / `byok_handshake_failed`
- `byok_key_saved` — `{ provider, is_first_key }`

## Postgres ↔ PostHog correlation

Enhance runs: copy `trace_id` from PostHog `enhance_completed` → query Supabase:

```sql
SELECT "createdAt", operation, status, "durationMs", "tokensUsed", "keySlot", metadata
FROM api_call_logs
WHERE "traceId" = '<trace_id>'
ORDER BY "createdAt";
```

CLI: `npm run pool:status -- <trace_id>`

## PostHog dashboard setup

```bash
POSTHOG_PERSONAL_API_KEY=phx_... npm run analytics:setup
```

Creates funnels/insights in dev + prod projects (onboarding, BYOK, extension).

## Internal traffic

- `localhost` / `127.0.0.1` → always `internal: true`
- Optional: `NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS` comma-separated user ids

## Privacy (follow-up)

Privacy policy update deferred. PostHog blocklist + replay input masking configured in PostHog UI. No resume/JD/API keys in event properties (`sanitize.ts`).

## Verification

**Local:** set dev key in `.env.local`, `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, open PostHog Live events, walk login → onboarding → dashboard → extension card.

**Prod:** set prod key in Vercel, deploy, smoke one funnel event.

---

## Setup checklist (start here — nothing configured yet)

Do **local dev first**, then prod when you deploy.

### Phase A — Local dev (`.env.local`)

- [ ] **A1.** Add PostHog vars (dev project **488025**) — **done** if `.env.local` contains `NEXT_PUBLIC_POSTHOG_KEY` (dev `phc_…`):

```bash
NEXT_PUBLIC_POSTHOG_KEY=<dev phc from PostHog project 488025>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ENV=dev
LOG_LEVEL=debug
```

- [ ] **A2.** PostHog UI (dev project): **web autocapture on**, replay **on** (100% OK for dev), errors **on**, blocklist + input masking. In app: `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true` in `.env.local` (extension ignores this).
- [ ] **A3.** `run easy` → open `/login` → PostHog **Live events** shows `$pageview`
- [ ] **A4.** Complete OAuth → see `login_completed` + `$identify`
- [ ] **A5.** Walk onboarding → see `onboarding_phase_viewed` / `onboarding_phase_completed`
- [ ] **A6.** Open Review Screen → `review_screen_opened`, tab change events
- [ ] **A7.** Rebuild extension: `npm run build:extension` (reads `.env.local`) → load unpacked → `extension_card_opened`
- [ ] **A8.** (Optional) Tag your traffic: after first login copy user id → `NEXT_PUBLIC_ANALYTICS_INTERNAL_USER_IDS=<id>`
- [ ] **A9.** (Optional) Dashboards: `POSTHOG_PERSONAL_API_KEY=phx_… npm run analytics:setup`

### Phase B — Production (Vercel + PostHog project **488042**)

- [ ] **B1.** PostHog UI (prod project): same settings as dev; replay sample **10–20%**
- [ ] **B2.** Vercel → Production env vars (see [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §3 + §8):

```bash
NEXT_PUBLIC_POSTHOG_KEY=<prod phc from project 488042>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ENV=prod
LOG_LEVEL=info
```

- [ ] **B3.** Deploy: `run easy prod` (after DB/OAuth cutover prerequisites)
- [ ] **B4.** Prod smoke: login on live domain → Live events with `environment: prod`
- [ ] **B5.** Before Chrome Web Store: `NEXT_PUBLIC_ANALYTICS_ENV=prod` + prod key in env → `npm run build:extension`

### Phase C — Later (not blocking)

Tracked in [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) § Analytics — Phase C.

- [ ] **Privacy policy** — disclose PostHog product analytics, session replay, and error tracking (`legal-documents-defaults` or admin `legalDocuments` config)
- [ ] **EU cookie consent** — evaluate for target regions; if required, gate PostHog init behind consent (not needed for US-only beta unless legal advises)

### Already done (code — no action needed)

- Event instrumentation (web + extension)
- `api_call_logs` Postgres AI telemetry
- Pino server logging
- `npm run build` + extension build pass in CI/local

---
