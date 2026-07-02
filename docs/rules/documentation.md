# Documentation maintenance

When you change architecture, entry flows, major modules, or user-visible behavior, update docs in the same change — do not defer to chat-only notes.

## Change → doc mapping

| Change type | Update |
|---|---|
| Enhance pipeline / AI flow / features framework | `docs/enhance-pipeline-design.md` |
| Architecture / major module / entry flow | `docs/ARCHITECTURE.md` — changelog row with date + one-line summary |
| Product-visible feature (dashboard, extension, onboarding) | `docs/PROJECT_STATE.md` |
| DB schema / Prisma model | `docs/database-schema.md` |
| Auth / onboarding gate | `docs/FLOW.md` |
| Resume engine contracts | `docs/resume/RULES.md` |
| Env / deploy pipeline / Vercel vs local | `docs/ENV.md`, `docs/DEPLOYMENT.md`, `docs/rules/env-domains.md` |
| Follow-up / action items | `docs/ACTION_ITEMS.md` |
| Finished deliverables | `docs/COMPLETED_ITEMS.md` with date |

## Rules

- Only update docs affected by the current change — never rewrite everything
- Never speculate beyond code — if unknown write "Not found in current context"
- Skip doc updates for trivial fixes (typos, single-line tweaks) unless they change documented behavior
- Do not expand README.md with feature details — point to `docs/` instead

## Onboarding / web UI changes

- New or updated wizard steps → `docs/FLOW.md` + `docs/PROJECT_STATE.md` + `docs/ARCHITECTURE.md` changelog row
- New Zustand stores or storage keys → `docs/database-schema.md` (client state section)
