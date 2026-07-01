# Chrome extension — build outputs

EasySubmit ships two **fixed** extension output folders. Each folder always targets one API host — they are never swapped by re-running a different command on the same path.

| Folder | API base | Manifest | Use |
|--------|----------|----------|-----|
| `dist/extension-dev/` | `http://localhost:3000` | Keeps `localhost` in `host_permissions` + `externally_connectable` | **Daily local dev** — load unpacked in your main Chrome profile |
| `dist/extension/` | `https://www.easysubmit.ai` | Strips `localhost` (Chrome Web Store requirement) | **Prod QA** + **Chrome Web Store upload** — use a separate Chrome profile |

Store builds **ignore** `.env.local` `NEXT_PUBLIC_APP_URL` so a dev env file cannot bake `localhost` into the prod package. At runtime, prod builds also ignore localhost tabs and stale localhost storage pins.

Source lives in `extension/` with shared logic in `src/shared/extension/`. Build scripts: `scripts/build-extension.mjs`, `scripts/build-extensions.mjs`.

---

## Commands

| Command | Output folder | When to use |
|---------|---------------|-------------|
| `npm run build:extension` | `dist/extension-dev/` | Local dev after code changes |
| `npm run build:extension:store` | `dist/extension/` | Before zipping for Chrome Web Store |
| `npm run build:extensions` | **Both** folders | `run easy` step 5 — dev + prod in one pass |

`run easy` / `run easy fast` runs `build:extensions`, so both folders are refreshed on every dev session start.

---

## Linking the extension to your account

The extension package does **not** include a “Connect account” flow. Linking happens on the **web dashboard** only (Chrome Web Store policy).

1. Sign in at [easysubmit.ai](https://www.easysubmit.ai).
2. Open **Job Tracker** → use **Connect extension** (or visit `/extension/bridge?extensionId=<your-id>`).
3. The bridge page issues a token to the extension in the background.

If the extension popup shows **Open dashboard**, you are not linked yet — complete setup on the website.

---

## Chrome setup

### Local dev (main profile)

1. `run easy` (or `npm run build:extension`)
2. Open `chrome://extensions` → **Developer mode** → **Load unpacked**
3. Select **`dist/extension-dev`** — toolbar shows **Dev Easy** (prod build shows **EasySubmit.ai — Job Tracker**)
4. Keep `next dev` running on `http://localhost:3000`
5. Connect: `http://localhost:3000/extension/bridge?extensionId=<your-id>`

### Prod QA (separate profile)

Use a **second Chrome profile** so prod and dev extensions do not share storage or auth.

1. `npm run build:extension:store` (or `run easy`, which also builds `dist/extension/`)
2. In the prod profile: **Load unpacked** → **`dist/extension`**
3. Connect: `https://www.easysubmit.ai/extension/bridge?extensionId=<your-id>`

---

## Chrome Web Store upload

1. Bump `version` in `extension/manifest.json` (store rejects duplicate versions).
2. Deploy the web app if bridge/auth behavior changed.
3. Build the store bundle:

   ```bash
   npm run build:extension:store
   ```

4. Zip with **manifest.json at the archive root**:

   ```bash
   cd dist/extension && zip -r ../../easysubmit-extension.zip .
   ```

5. Upload `easysubmit-extension.zip` in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).

CI does the same via `.github/workflows/deploy.yml` when the extension publish job runs.

**Upload `dist/extension/` only** — never zip `dist/extension-dev/` (it contains localhost permissions).

---

## What each build inlines

Both builds read `.env.local` at build time and inline `NEXT_PUBLIC_*` into the bundle via esbuild `define`:

| Variable | Dev build | Store build |
|----------|-----------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://www.easysubmit.ai` |
| `NEXT_PUBLIC_ANALYTICS_ENV` | `dev` | `prod` |
| `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE` | `false` | `false` |

Extension analytics use `src/shared/analytics/browser-extension.ts` (fetch to PostHog `/capture/`) — **not** `posthog-js` — so the store bundle passes MV3 remote-code review. `build-extension.mjs` fails the build if forbidden PostHog loader patterns appear in `content.js`, `popup/popup.js`, or `background.js`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Connect opens wrong host | Loaded wrong folder | Dev → `dist/extension-dev`; prod → `dist/extension` |
| Connect goes to localhost in prod profile | Loaded `extension-dev` | Switch unpacked path to `dist/extension` |
| Extension can't reach local dashboard | Loaded `dist/extension` in dev | Switch to `dist/extension-dev` |
| Old `dist/extension-prod/` folder on disk | Removed layout | Delete it; use `dist/extension/` for prod |

After changing which folder is loaded, click **Reload** on `chrome://extensions` or remove and re-add the unpacked extension.

---

## Related docs

- Job tracker + extension features: [`JOB_TRACKER.md`](./JOB_TRACKER.md)
- Store CI + GitHub secrets: [`DEPLOYMENT.md`](./DEPLOYMENT.md) (Half 2)
- `run easy` pipeline: [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md)
- Analytics keys at build time: [`analytics-option-a.md`](./analytics-option-a.md)
