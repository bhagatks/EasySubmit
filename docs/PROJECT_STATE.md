# Project State

## Completed

- **NextAuth** — Google + LinkedIn OAuth at `/login`; middleware + layout protect `/onboarding` and `/dashboard`
- **Typed env** — `lib/env.ts`, `types/env.d.ts` for OAuth credentials
- **Login UI** — Google-only OAuth on deep navy glass card (`LogoIcon` w-12, `size="xl"` CTA); `SessionProvider` via `components/providers/auth-provider.tsx`
- **Onboarding flow shell** — asymmetric layout, 4 macro phases, AnimatePresence step transitions
- **Resume mapping** — `/onboarding/step-4` + `ResumeMapping` (mint laser, data bits → buckets, LogoIcon zoom success → `/dashboard`)
- **Wizard wiring** — resume upload redirects to step-4; skip path advances to experience
- Full 11-step onboarding wizard with Zustand + sessionStorage persist
- Step 2 locations: Nominatim search + residential home-base (`isResidential`)
- Step 11 survey + Step 12 social proof → `finalizeProfile` → `/dashboard`
- Supabase Auth signup (`/auth/signup`) — legacy email/OAuth path
- `finalizeProfile` — Zustand payload → Prisma Postgres
- Protected `/dashboard` welcome page
- Prisma 7 + `@prisma/adapter-pg` schema for `user_profiles`
- Marketing landing (`/`) + extension page (`/extension`)

## Active work

- Production deploy (Vercel) — env vars + OAuth redirect URIs
- Dashboard features (job queue, apply flow)
- Real resume parsing (replace simulation)
- Chrome extension content-script sidebar

## Setup (local)

```bash
cp .env.example .env.local   # fill all vars
npx prisma migrate dev --name init
npm run dev                  # http://localhost:3000
```

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
npm run easy        # dev server
npm run easy:prod   # production build + start
npm run build       # prisma generate + next build
```
