# Chrome extension — launch & release runbook

**Listing live:** [EasySubmit.ai — Job Tracker](https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc)  
**Extension ID:** `ondcaafebdfegfkmdggeklofnmbijmlc`  
**Prod web:** `https://www.easysubmit.ai`

Canonical constants in code: `EXTENSION_ID`, `EXTENSION_STORE_URL` in `src/shared/brand.ts`.

Related: [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md) § Half 2 · [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) · [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md)

---

## Quick map — dev vs prod

| | **Dev (local)** | **Prod (live users)** |
|--|-----------------|------------------------|
| Web app | `http://localhost:3000` via `run easy` | `https://www.easysubmit.ai` — Vercel on `main` |
| Extension folder | `dist/extension-dev/` (**Dev Easy**) | CWS install or `dist/extension/` for QA |
| Extension API host | `localhost:3000` (inlined at build) | `www.easysubmit.ai` (store build) |
| Connect bridge | `/extension/bridge?extensionId=<unpacked-id>` | Same path on prod; CWS id is fixed above |
| DB | Dev Supabase (`.env.local`) | Prod Supabase `yofgnflcqajqsepbfdkc` (Vercel only) |
| PostHog | Project `488025`, `NEXT_PUBLIC_ANALYTICS_ENV=dev` | Project `488042`, `prod` |
| Publish extension | **Never** — load unpacked only | GitHub Actions → `publish_to_cws` |
| Store URL in UI | Same constant — opens public listing | Dashboard CTAs + force-upgrade → CWS |

---

## A. Dev — what to do locally

Use this while implementing or reviewing extension changes **before** merging to `main`.

### A1. One-time setup

```bash
cp .env.example .env.local    # if missing
# DATABASE_URL, DIRECT_URL, OAuth, Supabase — dev project only (see ENV.md)
run easy                      # tests + both extension folders + next dev
```

Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → **`dist/extension-dev`**.

Connect (use your unpacked extension id from `chrome://extensions`, not the CWS id):

```
http://localhost:3000/extension/bridge?extensionId=<your-unpacked-id>
```

### A2. Every extension change (before PR)

| Step | Command / action |
|------|------------------|
| 1 | Edit `extension/` or `src/shared/extension/` |
| 2 | Rebuild | `npm run build:extension` or restart `run easy` |
| 3 | Reload extension | `chrome://extensions` → **Reload** on Dev Easy |
| 4 | Unit tests | `npx vitest run --config config/vitest.config.ts lib/extension/` |
| 5 | Shared + brand tests | `npx vitest run --config config/vitest.config.ts lib/brand.test.ts src/shared/extension/` |

### A3. Dev smoke (localhost)

On a supported job page (LinkedIn, Greenhouse, Indeed, etc.):

- [ ] Toolbar popup — **Connect account** or connected state + tab status line
- [ ] **Show job card** — card mounts (Shadow DOM)
- [ ] **Save to tracker** — row appears on `http://localhost:3000/dashboard/job-tracker`
- [ ] Tailor runs → Review Screen; journey states advance on card
- [ ] Force path: weird page → **Add manually** → save with pasted JD
- [ ] Enhance / export from card detail views (if touching those paths)

### A4. Optional — prod bundle QA (still on laptop)

Use a **second Chrome profile** so dev and prod extension storage do not mix.

```bash
npm run build:extension:store   # → dist/extension/
```

Load unpacked → **`dist/extension`** (toolbar: **EasySubmit.ai — Job Tracker**).

Connect:

```
https://www.easysubmit.ai/extension/bridge?extensionId=<unpacked-id-from-this-build>
```

Confirms store manifest (`externally_connectable`, no localhost) talks to **prod web** before you publish.

### A5. Dev — do not

- Do **not** point `.env.local` `DATABASE_URL` at prod Supabase (`yofgnflcqajqsepbfdkc`) — `next dev` blocks this.
- Do **not** zip or upload `dist/extension-dev/` to Chrome Web Store.
- Do **not** put CWS OAuth secrets in Vercel or `.env.local` — they live in **GitHub Actions** only.
- Do **not** run PostHog admin scripts with full `.env.local` merge for DB — see [`rules/env-domains.md`](./rules/env-domains.md).

---

## B. Prod — first-time CWS closeout (after listing approved)

Run once after merging store URL + migration code, then repeat **B4–B7** for each extension release.

### B1. Merge web + DB migration to `main`

Commit includes at minimum:

- `EXTENSION_STORE_URL` / `EXTENSION_ID` in `src/shared/brand.ts`
- `forceUpgradeUpdateUrl` on `GET /api/extension/config`
- Migration `20260706203000_extension_cws_live`

Deploy web (pick one):

```bash
git push origin main          # Vercel auto-deploy
# or
run easy prod                 # tests + validate + vercel deploy --prod
```

Vercel build runs `prisma migrate deploy` — applies:

- `app_config.forceUpgrade.updateUrl` → CWS listing
- `app_config.extensionInstallPrompt.dashboardVisit` → `true`

**If migrate already ran but rows missing**, run on prod Supabase SQL editor:

```bash
# Same SQL as migration — safe to re-run
scripts/sql/extension-cws-live.sql
```

Verify:

```bash
npm run prod:health
node scripts/run.mjs admin -- npx prisma migrate status
```

### B2. Vercel Production env (verify — usually already set)

| Variable | Required for extension |
|----------|------------------------|
| `NEXTAUTH_URL` | `https://www.easysubmit.ai` |
| `NEXTAUTH_SECRET` | Prod-only |
| `SUPABASE_JWT_SECRET` | Extension auth tokens + Realtime |
| `NEXT_PUBLIC_SUPABASE_URL` | Realtime sync |
| `DATABASE_URL` / `DIRECT_URL` | Extension APIs + migrate |
| `ONET_API_KEY` | Pipeline vocabulary on Apply |

Full list: [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §3.

### B3. GitHub Actions secrets (one-time)

Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|--------|
| `CHROME_EXTENSION_ID` | `ondcaafebdfegfkmdggeklofnmbijmlc` |
| `CHROME_CRX_PRIVATE_KEY` | Full PEM (`easysubmit_private.pem` contents) |
| `CHROME_CLIENT_ID` | CWS Publish API OAuth client (**not** login OAuth) |
| `CHROME_CLIENT_SECRET` | Matching secret |
| `CHROME_REFRESH_TOKEN` | CWS OAuth refresh token |
| `EXTENSION_POSTHOG_KEY` | Optional — prod `phc_…` (PostHog project `488042`) |

### B4. Bump extension version

Edit `extension/manifest.json` — increment `version` (e.g. `1.0.8` → `1.0.9`).  
Chrome Web Store **rejects duplicate versions**.

Commit and push (or include in the release commit).

### B5. Publish to Chrome Web Store

1. GitHub → **Actions** → **Chrome Extension — Chrome Web Store**
2. **Run workflow** → check **`publish_to_cws`**
3. Wait for green run; download artifacts if you need local `easysubmit-extension.crx`

Push to `main` under `extension/**` or `src/shared/**` also builds artifacts but **does not** publish unless workflow is manual with `publish_to_cws`.

### B6. Prod web smoke (automated)

```bash
npm run prod:smoke
npm run prod:verify-posthog
npm run prod:health
npm run analytics:closeout    # optional — phx_ in .env.local; PostHog UI only
```

### B7. Prod extension smoke (manual — clean Chrome profile)

Install from the [public listing](https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc), not unpacked dev.

- [ ] Sign in at `https://www.easysubmit.ai/login`
- [ ] Open `/dashboard/extension` or complete `?setup=1` — **Get extension** opens CWS listing (not wrong URL)
- [ ] `/extension/bridge?extensionId=ondcaafebdfegfkmdggeklofnmbijmlc` — popup shows **Connected**
- [ ] Job page (LinkedIn / Greenhouse) — card → **Save to tracker** → `/dashboard/job-tracker`
- [ ] Tailor → Review Screen; keyword gap chips when `READY_TO_APPLY`
- [ ] PostHog prod (`488042`) — `extension_popup_opened`, journey / capture events with `environment: prod`
- [ ] Return visit without extension — install modal may show (`dashboardVisit` enabled)

### B8. Prod DB housekeeping (same deploy window)

| Item | Action |
|------|--------|
| RLS migration | Ships with next Vercel deploy if not yet applied (`20260702120000_enable_rls_public_tables`) |
| Legacy `app_config.aiConfig` | `scripts/sql/remove-legacy-ai-config.sql` on prod Supabase |
| System AI keys in vault | `node scripts/run.mjs admin -- npm run db:import-system-keys` |

See [`PROD_CUTOVER.md`](./PROD_CUTOVER.md) §1.

### B9. Force-upgrade (when you need to block old builds)

After a breaking extension release, enable minimum version in prod DB:

```sql
UPDATE app_config
SET value = jsonb_set(
  jsonb_set(value, '{enabled}', 'true'),
  '{minVersion}', '"1.0.9"'   -- match published manifest
)
WHERE key = 'forceUpgrade';
```

Old clients see in-card **Update** banner + HTTP 426 on extension APIs. `updateUrl` already points at CWS.

---

## C. Prod — every extension release (ongoing)

| # | Step |
|---|------|
| 1 | Dev smoke (§ A2–A3) on branch |
| 2 | Merge to `main` |
| 3 | Deploy web if shared/API changed (`extension/**` alone may skip Vercel if no web diff — still deploy if migration or `src/shared` used by web) |
| 4 | Bump `extension/manifest.json` `version` |
| 5 | GitHub Actions → manual workflow → **`publish_to_cws`** |
| 6 | Wait for CWS review (usually faster after first approval) |
| 7 | Prod smoke § B7 on the **store** build version |
| 8 | If breaking: raise `forceUpgrade.minVersion` (§ B9) |

**Web-only changes** (dashboard copy, store URL): Vercel deploy only — no CWS publish.  
**Extension-only changes**: CWS publish required; web deploy optional unless `src/shared` affects Next.js bundle.

---

## D. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Dashboard “Get extension” opens wrong listing | Old deploy before brand URL fix | Deploy `main`; verify `EXTENSION_STORE_URL` in built app |
| Connect fails on prod | Wrong folder or host mismatch | CWS users: prod web only; QA: `dist/extension` + prod bridge |
| CWS publish fails “duplicate version” | Forgot to bump manifest | Increment `extension/manifest.json` version |
| CWS publish fails signing | Missing `CHROME_CRX_PRIVATE_KEY` | Add full PEM to GitHub secrets |
| Extension APIs 426 | Force-upgrade enabled | Update from store or lower `forceUpgrade.enabled` in DB |
| Saved job not on dashboard | Extension connected to wrong host | Re-bridge on same host as dashboard |
| PostHog no extension events | Missing `EXTENSION_POSTHOG_KEY` in CI | Add prod `phc_` to GitHub secret; rebuild store bundle |

More: [`DEPLOYMENT_TROUBLESHOOTING.md`](./DEPLOYMENT_TROUBLESHOOTING.md) · [`EXTENSION_BUILD.md`](./EXTENSION_BUILD.md) § Troubleshooting

---

## E. Checklist summary

### Dev (before merge)

- [ ] `run easy` green / tests pass
- [ ] `dist/extension-dev` reloaded — popup + card smoke on localhost
- [ ] No prod DB URLs in local commands

### Prod (first closeout or release)

- [ ] `main` deployed to Vercel
- [ ] Migration `20260706203000_extension_cws_live` applied (or `extension-cws-live.sql`)
- [ ] GitHub CWS secrets present
- [ ] Manifest version bumped
- [ ] CI workflow with `publish_to_cws` succeeded
- [ ] § B7 manual smoke on CWS install
- [ ] `prod:smoke` + `prod:health` pass
