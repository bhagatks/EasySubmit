# EasySubmit.ai — Architecture

## Overview

Next.js 14 (App Router) web app + future Chrome extension (MV3). Onboarding is the current entry flow at `/onboarding`.

## Runtime

| Surface | Stack | Entry |
|---------|-------|-------|
| Web onboarding | Next.js 14, React, Tailwind, Framer Motion, Zustand | `/onboarding` |
| Auth signup | Supabase Auth | `/auth/signup` |
| Dashboard | Next.js (protected) | `/dashboard` |
| Chrome extension | MV3 + content-script sidebar (planned) | TBD |

## Directory map

```
app/                    Next.js App Router pages
components/
  layout/               Shared layouts (OnboardingLayout, FormSection, VisualSection)
  onboarding/           Wizard steps + OnboardingWizard
lib/
  generated/prisma/     Prisma client output
  onboarding/           Payload helpers
  profile/              finalizeProfile (Zustand → Postgres)
  supabase/             Auth clients + middleware
prisma/                 Schema + migrations
middleware.ts           Supabase session refresh
docs/                   System of record
```

## Onboarding wizard

Three-step client-side wizard (`OnboardingWizard`):

1. **Timeline** — job search urgency → `jobTimeline` in Zustand
2. **Locations** — US/CA city selection → `targetLocations` in Zustand
3. **Resume upload** — dropzone → `isMapping` on same step; VisualSection radar→data mapping; manual skip link → experience
4. **Experience** — multi-select up to 2 levels
7. **Role interest** — single role pill + search
8. **Salary** — min salary slider ($30k–$300k)
9. **Matches** — sample job matches preview
10. **Referral survey** — how did you hear about us
11. **Social proof** — recruiter quote → auth signup

Post-wizard: Supabase signup → `finalizeProfile` (Prisma transaction) → `/dashboard`.

Step transitions use Framer Motion fade + horizontal slide. Progress bar: 8% → 100% across 11 steps.

**Layout:** Split-screen asymmetric grid (`grid-cols-1 lg:grid-cols-2`, `#F9FAFB` page bg). `FormSection` (centered, `p-10`, max-width 500px) alternates left/right by step parity; `VisualSection` (`#F1F5F9` bg) hosts `CareerVisual` + bottom-right **Restart** (`resetStore`). Career Navigator tone via `NavigatorTip` (no founder avatar).

## Changelog

| Date | Summary |
|------|---------|
| 2026-06-15 | `NavigatorSideVisual`: Framer Motion side-panel states (idle constellation, location radar, mapping scan) |
| 2026-06-15 | Resume step: in-place mapping flow — dropzone stays on step, VisualSection radar→data mapping, manual skip link |
| 2026-06-15 | Step 3 locations: Navigator-style pills, home-base icon, Nominatim search |
| 2026-06-15 | Onboarding layout refactor: `FormSection` / `VisualSection`, `CareerVisual`, Restart → `resetStore` |
| 2026-06-15 | `CareerNavigatorAnimation`: radar / data extraction / career tree abstract visuals |
| 2026-06-15 | Resume step: in-place digital scan via `isMapping`; manual profile skip link |
| 2026-06-15 | Step 2 locations: Nominatim search, residential home-base pills with `setResidential` |
| 2026-06-15 | Onboarding split-screen layout: alternating form/visual columns + `OnboardingVisual`; Career Navigator branding |
| 2026-06-15 | Initial Next.js scaffold + onboarding step 1 (timeline) |
| 2026-06-15 | Onboarding steps 2–3, Zustand store, wizard transitions |
| 2026-06-15 | Onboarding steps 4–6: resume upload, parsing simulation, analysis complete |
| 2026-06-15 | Onboarding steps 7–11: experience, roles, salary, matches, referral survey |
| 2026-06-15 | Step 12 social proof, Supabase auth signup, Prisma finalizeProfile, dashboard |
| 2026-06-15 | Removed onboarding value-prop step (5x faster marketing screen); wizard is now 11 steps |
