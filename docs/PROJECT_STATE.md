# Project State

## Completed

- **AI Engine — Enhance with AI** — … **`[EnhanceAI]` pipeline `step` + `hint`** logs with traceId correlation; **`api_call_logs`** Postgres telemetry via `src/shared/observability` (`[ApiCall]` prefix, provider/slot/label/billingMode/latency/tokens); **system key pool v1** — per-call acquire/failover (`executeWithPoolRetry`), 3-slot Alpha/Beta/Gamma, 3k daily platform cap, Gamma paid overflow hot-toggle, Pass 2 stickiness + `partialEnhance`
- **Glossy UI system** — Shared primitives in `components/ui/`: `DialogContent appearance="glossy"`, `AppAlertDialog`, `GlossyPromoOverlay`, `GlossyFullscreenShell`, `InlineAlert` (`surface="glass"`); used across login, BYOK nudge, confirm dialogs, enhance AI, IgnitionGate, SynthesisTransition
- **Legal & auth** — `/terms`, `/privacy` (Teal/Rezi-style); reusable `components/legal/` overlay for in-app Terms/Privacy; login consent below OAuth buttons with overlay links; Settings Plan & engine privacy copy + AI source toggle; `termsAcceptedAt` on OAuth sign-in
- **Ignition Gate UI** — `src/components/auth/IgnitionGate.tsx`: `ProviderFuelSelect` dropdown for 6 BYOK providers with Lucide icons; scanning-beam validation; cache skip via `lastDiscovery`; Launch/Resume gated on `isIgnitionComplete()`
- **Dashboard gate** — `components/dashboard/DashboardIgnitionGuard.tsx` syncs client ignition with server `vaultKeyId` (resets stale session after key revoke); no navigation block on missing BYOK; one-time `DashboardByokNudge` toast; `BYOK Inactive` on sidebar AI Keys tab; `KeyProtector` overlay reserved for provider auth failures during active use
- **Ignition store** — `src/stores/use-ignition-store.ts`: `unlock`/`lock`/`setActiveModel`; `provider` + `activeModel` in `localStorage`; BYOK `apiKey` AES-GCM encrypted in `sessionStorage` only; `restoreIgnitionFromSession` repopulates `availableModels` from model cache on reload
- **AppConfig** — `src/lib/config/app.config.ts`: `PROVIDER_REGISTRY` (6 providers with `baseUrl` + `handshakeEndpoint`) + `SYSTEM_DEFAULTS`; `ai-config.ts` re-exports for backward compatibility
- **AI config layer** — `model-discovery.ts`, `model-cache.ts`, `career-grade-models.ts` consume `app.config.ts`; BYOK discovery via `app/actions/ai/discovery-service.ts` + `src/lib/ai/neural-controller.ts`
- **NextAuth** — Google + LinkedIn OAuth at `/login`; middleware + layout protect `/onboarding` and `/dashboard`
- **Typed env** — `lib/env.ts`, `types/env.d.ts` for OAuth credentials
- **Login UI** — Google-only OAuth on deep navy glass card (`LogoIcon` w-12, `size="xl"` CTA); `SessionProvider` via `components/providers/auth-provider.tsx`
- **Sign out** — `components/auth/SignOutButton.tsx` + `lib/auth/sign-out-client.ts`; available on all onboarding routes via `OnboardingFlowShell`; clears Zustand onboarding/ignition storage then NextAuth `signOut` → `/login`
- **Onboarding hub** — `/onboarding`: 3-phase Unified Workbench with unified top chrome (`OnboardingWorkbenchChrome`: EasySubmit brand + phase label/description + phase actions + Sign Out, progress bar, Identity \| Import \| Studio tabs); finalize CTA **Finalize & continue**; ATS sample PDF/DOCX in Import header actions; Studio header: Raw text, Expand all, Import back, Enhance with AI (when flag + system AI on)
- **Resume spec** — `docs/resume/RULES.md`; golden templates in `assets/resume/templates/`; `lib/resume/resumeSpec.ts`; Fuel panel sample download via `/api/resume/ats-template`
- **Open-Resume parser** — PDF via browser Open-Resume engine; **DOCX → PDF** via `docx-to-pdf-wasm` on `/api/resume/convert-docx`, then same PDF parser; heuristic DOCX fallback if conversion parse fails; parsed text normalized via `lib/resume/normalizeResumeText.ts` (junk chars, list markers, smart quotes)
- **Onboarding workbench** — `/onboarding` is the default post-login entry: 60/40 split (Coordinates → Fuel → Refinery), full-screen shell (no sidebar); `/onboarding/step-1` and `/onboarding/workbench` redirect here
- **Resume Studio workbench** — shared `ResumeStudioWorkbench` (onboarding phase 3 + dashboard profile edit): 50/50 resizable split; left preview with auto fit-to-pane zoom (first visit), transparent ± overlay, thin page separators; **dashboard only** — right pane **Editor \| Layout** tabs (onboarding uses Identity → Import → Studio breadcrumb only); Editor = collapsible ATS sections (+ custom sections), onboarding expands Header + Skills by default, dashboard all collapsed; Layout = stacked font + page size (US Letter or A4); zoom `easysubmit-studio-zoom-v1`, page size `easysubmit-page-size-v1`
- **Onboarding flow shell** — asymmetric layout for legacy route wrappers; full-screen bypass for `/onboarding`
- **Codebase cleanup** — removed legacy 11-step wizard, alternate refinery/workbench UIs, TanStack `start/` app, orphan layout/visual components; minimal `components/ui` set retained
- Supabase Auth signup (`/auth/signup`) — legacy email/OAuth path
- `finalizeProfile` — Zustand payload → Prisma Postgres
- **Dashboard shell** — `/dashboard`: Lovable-derived sidebar layout (`DashboardShell`), overview with stats/recent applications/ATS Guarantee (`DashboardOverview`); **Resume profiles** at `/dashboard/resume-profiles` — multi-profile list (target role primary label, person name subtitle), Edit / Set default / Delete (when >1), `+` → copy default or blank → Studio editor at `/dashboard/resume-profiles/[id]/edit`; onboarding default profile marked `isDefault`; nav stubs for Applications; **Settings** at `/dashboard/settings` — account name (`users` only), read-only email, OAuth connect badges, engine status + link to AI Keys, sign out; header `BYOKStatusBadge` when vaulted; sidebar **AI Keys** shows `BYOK Inactive` when cold; one-time BYOK nudge on first dashboard load; cold-state Engine Cold canvas + Ignition Chamber hint; `KeyProtector` for auth-failure re-lock only
- **Multi resume profiles** — many `profiles` per login with `isDefault`; structured resume in `profiles.content` JSONB; engine/stats read default profile; `app/actions/resume-profiles.ts`
- **Login identity** — `users.firstName` / `users.lastName` extracted at OAuth; session + onboarding Identity prefill; resume edits no longer write `users`
- **Profile model** — `Profile` (many per `User`, one `isDefault`) with `content` JSONB for all resume sections + `calibrationScore`; multi-provider email linking via NextAuth
- Marketing landing (`/`) + extension page (`/extension`)

## Active work

- Production deploy (Vercel) — env vars + OAuth redirect URIs
- Dashboard data wiring (real stats, applications from Prisma)
- Dashboard features (job queue, apply flow)
- Real resume parsing (replace simulation)
- Chrome extension content-script sidebar

## Setup (local)

```bash
run easy    # local dev — see docs/ENV.md
```

Deploy production: `run easy prod` (Vercel — no local prod env files).

## Deploy (Vercel)

1. Connect repo `bhagatks/EasySubmit` to Vercel
2. Set environment variables (see `.env.example`)
3. Set `NEXTAUTH_URL` to production URL (e.g. `https://easysubmit.ai`)
4. Add OAuth redirect URIs:
   - Google: `https://<domain>/api/auth/callback/google`
   - LinkedIn: `https://<domain>/api/auth/callback/linkedin`
5. `npx vercel --prod` or push to main with Vercel Git integration

See `docs/ACTION_ITEMS.md` for checklist.

## Dev

```bash
run easy            # local dev (.env.local)
run easy prod       # deploy to Vercel (prod env on Vercel only)
npm run db:check    # test local DB connection
npm run build       # prisma generate + next build
```
