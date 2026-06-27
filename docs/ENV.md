# Environment

Two commands — local secrets on disk, production secrets on **Vercel only**.

| Command | Purpose |
|---------|---------|
| **`run easy`** | Local dev — `.env.local`, migrations, dev server (browser manual by default) |
| **`run easy prod`** | Deploy pipeline — tests → prod migrations (env pulled from Vercel) → `vercel deploy --prod` |

## Local dev

```bash
run easy
```

Auto-creates `.env.local` from `.env.example` on first run. One-time: paste `DATABASE_URL` if still a placeholder.

When the server is ready, the terminal prints the login URL — open it yourself in any browser.

Optional auto-open incognito login (old behavior):

```bash
EASY_OPEN_BROWSER=1 run easy
```

## Production deploy

Prod config lives in **Vercel → Environment Variables** (see `.env.vercel.example` as a checklist).

```bash
run easy prod
```

Pipeline:

1. Removes any legacy local prod env files (`.env.production.local`, etc.)
2. `npm test`
3. Pulls production env from Vercel **temporarily** → runs `prisma migrate deploy` → deletes temp file
4. `vercel deploy --prod`

One-time: `vercel login` and `vercel link` (prompted automatically).

## Files

```
.env.example           → local dev template (committed)
.env.vercel.example    → Vercel prod checklist (committed, not copied locally)
.env.local             → local secrets only (gitignored)
.env.vercel.deploy.tmp → ephemeral during deploy (gitignored, auto-deleted)
```

## OAuth credentials

Login uses NextAuth (Google + LinkedIn). Required vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

**Full setup (Google Cloud Console, redirect URIs, troubleshooting):** [`docs/oauth-setup.md`](./oauth-setup.md)

**Production cutover (DB + Vercel + OAuth prod):** [`docs/PROD_CUTOVER.md`](./PROD_CUTOVER.md)

## Troubleshooting

**P1000 on local dev:** update `DATABASE_URL` in `.env.local`, run `run easy` again.

**Deploy fails on env pull:** ensure `DATABASE_URL` is set in Vercel Production environment variables.

**OAuth loops locally:** use a fresh incognito/private window, or run `EASY_OPEN_BROWSER=1 run easy` to auto-open one. See [`oauth-setup.md`](./oauth-setup.md) for redirect URI and consent-screen fixes.

## Analytics (PostHog)

See [`docs/analytics-option-a.md`](./analytics-option-a.md).

| Variable | Dev (`.env.local`) | Prod (Vercel) |
|----------|-------------------|---------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Dev project `488025` | Prod project `488042` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | same |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | `dev` | `prod` |
| `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE` | `true` | `true` (web only; extension build forces `false`) |
| `LOG_LEVEL` | `debug` | `info` |

Dashboard bootstrap (optional): `POSTHOG_PERSONAL_API_KEY=phx_... npm run analytics:setup`

## JDSkills (optional — north-star enhance)

Used by `fetchJdSkillsVocabulary()` when extracting skills from job descriptions. Deterministic extraction always runs; ESCO/ESCOX are optional enrichers.

| Variable | Default | Purpose |
|----------|---------|---------|
| `ESCO_API_BASE` | `https://ec.europa.eu/esco/api` | ESCO REST API base URL |
| `ESCO_API_ENABLED` | enabled (set `false` to skip) | Disable ESCO phrase enrichment |
| `ESCOX_URL` | unset | Self-hosted ESCOX sidecar base URL |
| `ESCOX_ENABLED` | off (requires `true`) | Enable ESCOX sidecar extraction |

No keys required for the default ESCO public API. ESCOX is off unless you self-host and set both `ESCOX_URL` and `ESCOX_ENABLED=true`.
