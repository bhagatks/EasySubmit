# Project State

## Completed

- Full 11-step onboarding wizard with Zustand + sessionStorage persist
- Split-screen onboarding layout with alternating columns + step visuals
- Step 2 locations: Nominatim search + residential home-base selection (`isResidential`)
- Resume step: upload or manual skip triggers in-place digital scan (`isMapping`); skips separate parsing/analysis screens
- `NavigatorSideVisual` in visual column (constellation, location radar, profile mapping)
- Step 11 survey + Step 12 recruiter social proof
- Supabase Auth signup (`/auth/signup`) — email/password + Google OAuth
- `finalizeProfile` — Zustand payload → Prisma Postgres transaction
- Resume upload to Supabase Storage (bucket: `resumes`)
- Protected `/dashboard` welcome page
- Prisma 7 + `@prisma/adapter-pg` schema for `user_profiles`

## Active work

- Dashboard features (job queue, apply flow)
- Real resume parsing (replace simulation)
- Chrome extension content-script sidebar

## Setup required

Copy `.env.example` → `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (Supabase Postgres connection string)

Then run:
```bash
npx prisma migrate dev --name init
```

Create Supabase Storage bucket `resumes`.

## Dev

One-time shell setup (add to `~/.zshrc`):

```bash
run() {
  local repo="/Users/bstar/EasySubmit"
  if [[ $# -ge 1 && -x "$repo/scripts/run" ]]; then
    "$repo/scripts/run" "$@"
  else
    command run "$@"
  fi
}
```

Then from anywhere:

```bash
run easy        # dev server → http://localhost:3000/onboarding
run easy prod   # production build + start
```

Or from the repo root without the alias:

```bash
./scripts/run easy
./scripts/run easy prod
# npm equivalents:
npm run easy
npm run easy:prod
```
