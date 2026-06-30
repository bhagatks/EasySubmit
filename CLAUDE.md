# EasySubmit — Claude Code Rules

## Shared Rules

The following files in `docs/rules/` are the single source of truth — both Claude Code and Cursor read from them. Do not duplicate their content here.

| Rule | File |
|---|---|
| Observability & logging | `docs/rules/observability-logging.md` |
| Documentation maintenance | `docs/rules/documentation.md` |
| Sidepanel completion gate | `docs/rules/sidepanel-completion.md` |
| Testing & coverage gate | `docs/rules/testing.md` |
| Analytics & PostHog events | `docs/rules/analytics.md` |

---

## Project Identity

- **Brand:** EasySubmit.ai
- **Mission:** Beat every competitor on ATS resume quality + automate job applications end-to-end.
- **Product surfaces:** Next.js 14 web dashboard + Chrome Extension (MV3) + AI resume engine.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript — strict, no `any` without justification |
| Database | Supabase Postgres + Prisma ORM |
| Auth | NextAuth (Google + LinkedIn OAuth) |
| State | Zustand (onboarding + ignition stores) |
| Styling | Tailwind CSS — dark-first OKLCH design system |
| AI | BYOK (6 providers) + system Gemini key pool |
| Icons | Lucide React |
| Tests | Vitest (`config/vitest.config.ts`) |

---

## Design System

- **Surface:** `oklch(0.16 0.04 268)` deep navy
- **Engine glow:** `oklch(0.62 0.21 265)` primary blue
- **System mint:** `oklch(0.82 0.16 165)` success/active
- **Warning red:** `oklch(0.55 0.22 25)`
- **Global radius:** 12px (`rounded-xl`)
- **Display font:** Space Grotesk (`font-display`)
- **Body font:** DM Sans (`font-sans`)
- **Tone:** Empowered "Career Navigator" — professional, not robotic. Never cutesy.
- Buttons say **"Continue"** not "Next". CTAs are action-forward.
- Extension UI injected via **Shadow DOM** to prevent CSS leaks.

---

## Directory Map

```
app/                    Next.js App Router pages + server actions
components/dashboard/   Dashboard UI components
components/ui/          Shared shadcn primitives
lib/                    Pure logic — no React imports
lib/job-tracker/        Job tracker domain logic
lib/job-tracker/ats/    ATS intelligence (parse sim, keyword gap, bullet quality, score)
lib/job-tracker/export/ Resume export pipeline (docx, pdf, html)
lib/profile/            Resume profile helpers
lib/ai/                 AI enhance pipeline
lib/resume/             Resume spec, fonts, parsing
src/lib/ai/             AI engine internals (key pool, enhance)
src/stores/             Zustand stores
extension/              Chrome MV3 source
prisma/                 Schema + migrations
docs/                   System of record — always authoritative
assets/resume/          ATS golden templates (PDF + DOCX fixtures)
```

---

## Core Business Rules

### Features Framework (enforce for every new feature)
- **Full rules:** `docs/features-framework.md` — read before building any feature that touches a flag, config, quota, or user setting
- Entry point: `lib/features/index.ts` → `resolveFeature({ feature, userId, surface })`
- **Any feature that depends on a feature flag, app config, subscription state, quota, or routing decision MUST be registered here — no exceptions**
- Never call `getFeatureFlags()`, `getAppConfig()`, `isSubscribed()`, or `resolveAiRoute()` directly in a server action or API route — use `resolveFeature()` instead
- Registered features today: `enhance`, `subscription`

### AI routing (enforce in every AI action)
1. Check `vaultKeyId` — if BYOK key vaulted → use it (unlimited)
2. Check `aiDailyUnlimited` — if true (BYOK user) → unlimited system AI
3. Check `app_config.aiEngine.quotas.system.enable` — if off → block
4. Check daily quota → decrement and proceed, or block with `capacity_exhausted`

### Resume format (non-negotiable)
- **Full spec:** `docs/resume/RULES.md` — read it before touching any export or preview code
- **Section order** (fixed, never reorder): Header → Summary → Skills → Experience → Education → Certifications → Projects → Languages
- **Section names** must match `RESUME_SECTION_TITLES` in `lib/resume/resumeSpec.ts` exactly — ATS keyword mapping depends on these strings
- **Never:** multi-column, tables for layout, text boxes, header/footer fields, images, typed unicode bullets, hidden text, creative section names, skill ratings
- **Always:** single column, real `NumberingType.BULLET` list numbering, right-aligned tab stops for title↔date lines, Calibri/Arial/Helvetica only
- **Export pipeline:** `lib/job-tracker/export/resume-style.ts` is the single source of truth for all visual constants — all three renderers (HTML preview, PDF, Word) pull from it

### Chrome extension
- Manifest V3 only — service worker background, no persistent background page
- Cross-context messaging via `chrome.runtime.sendMessage` / `onMessage` / `connect` ports only — no shared memory
- Always handle `chrome.runtime.lastError` on every async callback
- External dashboard ↔ extension via `chrome.runtime.onMessageExternal` + `externally_connectable`
- Never edit `dist/` — build outputs only

---

## File Safety Rules

- **Edit freely:** `app/`, `components/`, `lib/`, `src/`, `extension/`, `prisma/`, `docs/`, `config/`
- **Never edit:** `dist/`, `.next/`, `node_modules/`, `assets/resume/templates/` (golden fixtures)
- Shared logic used by both web and extension lives in `src/shared/`
- Path alias `@/` maps to the project root

---

## Documentation Rules

Full rules: **`docs/rules/documentation.md`** — both Claude Code and Cursor read from this file.

The `/docs` folder is the **system of record**. After any meaningful change:

| Change type | Update |
|---|---|
| Enhance pipeline / AI flow / features framework | `docs/enhance-pipeline-design.md` — the design reference for this whole area |
| Architecture / major module / entry flow | `docs/ARCHITECTURE.md` — changelog row with date + one-line summary |
| Product-visible feature (dashboard, extension, onboarding) | `docs/PROJECT_STATE.md` |
| DB schema / Prisma model | `docs/database-schema.md` |
| Auth / onboarding gate | `docs/FLOW.md` |
| Resume engine contracts | `docs/resume/RULES.md` |
| Follow-up / action items | `docs/ACTION_ITEMS.md` |
| Finished deliverables | `docs/COMPLETED_ITEMS.md` with date |

**Rules:**
- Only update docs affected by the current change — never rewrite everything
- Never speculate beyond code — if unknown write "Not found in current context"
- Skip doc updates for trivial fixes (typos, single-line tweaks) unless they change documented behavior

---

## Completion Gate (before marking any user-visible work done)

1. **Tests** — run `npx vitest run --config config/vitest.config.ts` and fix failures. Add tests for any new shared logic in `lib/` or `src/shared/`.
2. **Types** — run `npx tsc --noEmit` and confirm zero new errors in changed files.
3. **Docs** — update the relevant doc files above.
4. **Logging** — full logging rules in `docs/rules/observability-logging.md` (shared with Cursor). Short version: log `start`/`done`/`fail` for every step; use `logEnhanceDiag` + catalog for the enhance pipeline.
5. **Build** — confirm `npm run build` passes before claiming a feature is done.

---

## Coding Conventions

- Functional components only — no class components
- No `any` — use `unknown` + type guards if shape is truly unknown
- No default exports from lib files — named exports only
- Server actions in `app/actions/` — never import server-only code into client components
- `"use client"` only when the component genuinely needs browser APIs or event handlers
- Prefer editing existing files over creating new ones
- No comments explaining *what* code does — only *why* when the reason is non-obvious
- No half-finished implementations — if a feature isn't ready, don't wire it up
- Do not add error handling for impossible cases — trust internal contracts
- Nominatim API: always debounce

---

## Test Commands

```bash
# Run all lib tests
npx vitest run --config config/vitest.config.ts

# Run specific file
npx vitest run --config config/vitest.config.ts lib/job-tracker/ats/ats.test.ts

# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server (full pipeline)
run easy
run easy fast   # skip tests

# Production deploy (manual)
run easy prod
run easy prod fast

# DB seed
npm run db:seed
```

---

## Key Files Quick Reference

| What | Where |
|---|---|
| Resume ATS rules (canonical) | `docs/resume/RULES.md` |
| Resume section order + titles | `lib/resume/resumeSpec.ts` |
| Export visual constants | `lib/job-tracker/export/resume-style.ts` |
| Word export | `lib/job-tracker/export/resume-docx.ts` |
| PDF export | `lib/job-tracker/export/resume-pdf.tsx` |
| HTML preview builder | `lib/job-tracker/export/resume-preview-html.ts` |
| ATS parse simulator | `lib/job-tracker/ats/ats-parse-simulator.ts` |
| Keyword gap analysis | `lib/job-tracker/ats/keyword-gap.ts` |
| Bullet quality engine | `lib/job-tracker/ats/bullet-quality.ts` |
| Readiness score | `lib/job-tracker/ats/resume-readiness-score.ts` |
| Features framework rules | `docs/features-framework.md` |
| Features framework entry | `lib/features/index.ts` |
| Enhance feature resolver | `lib/features/resolve-enhance.ts` |
| Subscription feature resolver | `lib/features/resolve-subscription.ts` |
| AI routing / enhance | `lib/ai/enhance-resume-for-user.ts` |
| App config (AI quotas, flags) | `src/lib/config/app.config.ts` |
| Feature flags | `lib/services/feature-flags-service.ts` |
| Auth options | `lib/auth.ts` |
| Prisma client | `lib/prisma.ts` |
| Job tracker types | `lib/job-tracker/types.ts` |
| Review Screen | `components/dashboard/ReviewScreen.tsx` |
| Pipeline tailor | `lib/extension/pipeline-tailor.ts` |

---

## Claude Code Session Rules

- Never explore the full codebase unless explicitly asked
- Read only the files directly relevant to the task
- Do not run `npm run build` or full test suite unless asked — run targeted tests only
- No explanatory summaries at end of response unless asked

---

## Session Discipline

- Use `/clear` between unrelated tasks — never carry over context from a previous topic
- Always reference specific files and line numbers in prompts (e.g. `lib/auth.ts:42`) rather than describing symptoms
- Split explore-then-implement work into two separate sessions: locate first, edit second
- Prefer targeted test runs (`npx vitest run --config config/vitest.config.ts <specific-file>`) over full suite
- Do not re-read files already established in the current session
- If a task is done, stop — do not propose follow-up refactors or related improvements unless asked
