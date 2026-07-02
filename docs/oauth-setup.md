# OAuth setup (Google + LinkedIn)

NextAuth handles login at `/login` → `/api/auth/[...nextauth]`. Config lives in `lib/auth.ts`; env validation in `lib/env.ts`.

## Required env vars

Set these in `.env.local` (local) or Vercel → Environment Variables (production). See also `.env.vercel.example`.

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | App origin — must match how you open the site (scheme, host, port) |
| `NEXTAUTH_SECRET` | Session signing secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Web client secret |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app client secret |

**Local example**

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
LINKEDIN_CLIENT_ID=<from LinkedIn Developer Portal>
LINKEDIN_CLIENT_SECRET=<from LinkedIn Developer Portal>
```

In development, missing OAuth vars fall back to placeholders in `lib/env.ts` so the UI loads — sign-in will not work until real credentials are set.

Restart the dev server after changing env vars (`run easy`).

---

## Google OAuth — start from scratch

Use this when credentials were deleted, rotated, or the Cloud project was misconfigured.

### 1. Create or select a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. **Select a project** → **New project** (e.g. `EasySubmit Dev`)
3. Select that project in the top bar

### 2. Configure OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External** (or **Internal** for Google Workspace–only apps)
3. Fill required app info (name, support email, developer contact)
4. Scopes: defaults are enough — the app requests `openid`, `email`, and `profile` in `lib/auth.ts`
5. While status is **Testing**, add your Google account under **Test users**
6. Save

**Brand verification (logo + app name on Google sign-in)**

Google will not show your logo or app name until brand verification is approved. The homepage at `https://www.easysubmit.ai` must:

- Display the OAuth app name **`EasySubmit.ai`** prominently as plain text in the hero `<h1>` on `app/page.tsx` (must match the OAuth consent screen name exactly)
- Include a **"What is EasySubmit.ai?"** section explaining app purpose, features, and why Google sign-in is used
- Link **Privacy Policy** and **Terms of Service** on the homepage (hero + footer); URLs must match OAuth consent screen config

After deploying homepage updates, use **Verification Center → I have fixed the issues → Request re-verification**.

### 3. Create OAuth client (Web application)

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**
2. Application type: **Web application** (not Android/iOS/Desktop)
3. Name: e.g. `EasySubmit Local`

**Authorized JavaScript origins**

```
http://localhost:3000
```

Add production when deploying:

```
https://<your-prod-domain>.vercel.app
```

**Authorized redirect URIs** (NextAuth v4 — must match exactly)

Local:

```
http://localhost:3000/api/auth/callback/google
```

Production:

```
https://<your-prod-domain>.vercel.app/api/auth/callback/google
```

4. **Create** → copy **Client ID** and **Client secret** into `.env.local`

### Common Google mistakes

| Mistake | Symptom |
|---------|---------|
| Wrong client type (Android/iOS) | OAuth fails immediately |
| Redirect URI typo (`/auth/callback` vs `/api/auth/callback/google`) | `redirect_uri_mismatch` on Google’s error page |
| `https://localhost:3000` instead of `http://` | `redirect_uri_mismatch` |
| Wrong port (not 3000) | `redirect_uri_mismatch` |
| Consent screen in Testing without your email as test user | `access_denied` |
| Old client secret after rotation | Back to `/login?error=...` after Google consent |

---

## LinkedIn OAuth (reference)

LinkedIn uses OpenID Connect in `lib/auth.ts`. Register an app in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).

**Redirect URI (local)**

```
http://localhost:3000/api/auth/callback/linkedin
```

**Redirect URI (production)**

```
https://<your-prod-domain>.vercel.app/api/auth/callback/linkedin
```

Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in env. Prod callbacks are tracked in `docs/ACTION_ITEMS.md`.

---

## Expected login flow

1. User opens `/login`, accepts terms, clicks **Continue with Google** (or LinkedIn)
2. Browser redirects to the provider
3. Provider redirects to `/api/auth/callback/<provider>`
4. NextAuth creates/updates `users` + `accounts` (see `docs/database-schema.md`)
5. User lands on `/onboarding` (or `/dashboard` if onboarding is complete)

Post-login routing: `docs/FLOW.md`, identity rules: `docs/IDENTITY_AND_BOOT_RULES.md`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Google: **redirect_uri_mismatch** | Console redirect URI ≠ running app URL | Fix redirect URI in Google Cloud Console |
| Google: **access_denied** | Testing mode, user not in test users | Add email under OAuth consent screen → Test users |
| `/login?error=OAuthAccountNotLinked` | Same email, different provider history | Use original provider, or retry — linking is enabled in `lib/auth.ts` |
| `/login?error=...` (generic) | Bad secret, DB error, or stale session | Verify env vars; try incognito; check server logs |
| OAuth loop (keeps returning to login) | Stale cookies / mixed sessions | Incognito window, or `EASY_OPEN_BROWSER=1 run easy` |
| Stuck on “Redirecting…” | Bad `NEXTAUTH_URL` or dev server 500 | Confirm `NEXTAUTH_URL`; check terminal for build errors |

**Generate a new session secret**

```bash
openssl rand -base64 32
```

Paste the output into `NEXTAUTH_SECRET` in `.env.local` (or Vercel) and restart.

---

## Production checklist

**Full cutover list (DB, Vercel env, OAuth, storage, smoke tests):** [`PROD_CUTOVER.md`](./PROD_CUTOVER.md)

1. Create **separate** OAuth clients (or add prod URLs to the same Web client) for production origins
2. Set all six auth env vars in **Vercel → Production** — prod `GOOGLE_*` must match prod redirect URIs (not localhost-only dev client)
3. Set `NEXTAUTH_URL` to the live domain (no trailing slash); generate a **prod-only** `NEXTAUTH_SECRET`
4. Resolve prod DB migrations (see [`MIGRATION_RECOVERY.md`](./MIGRATION_RECOVERY.md) if P3009)
5. Run `run easy prod` (see [`ENV.md`](./ENV.md))
6. Smoke test: `/login` → Google → `/onboarding`
