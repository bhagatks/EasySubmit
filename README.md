# EasySubmit.ai

Automate job applications with a self-learning AI engine — Next.js web app + Chrome extension (planned).

## Quick start

```bash
run easy             # local dev — see docs/ENV.md
run easy prod        # deploy to Vercel
npm test             # unit tests
npm run build        # production build
```

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router (pages, API routes, globals.css) |
| `components/` | React UI (dashboard, onboarding, shadcn primitives) |
| `src/` | Headless engine — AI config, ignition store, shared components |
| `lib/` | Server/shared logic (auth, resume parser, Prisma helpers) |
| `assets/` | Non-public fixtures (ATS templates, sample PDFs) — **not** served by Next |
| `public/` | Static web assets (`/assets/hero-resume.jpg`, etc.) |
| `docs/` | System of record — architecture, flow, env, resume rules |
| `config/` | Tooling config (Vitest, Tailwind extend) |
| `scripts/` | Dev/bootstrap/validation scripts |
| `prisma/` | Schema + migrations |

### Root files (required by tooling)

- `middleware.ts`, `next.config.mjs`, `postcss.config.mjs` — Next.js
- `prisma.config.ts` — Prisma CLI
- `tsconfig.json`, `package.json` — TypeScript / npm

Full architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Resume spec

- Rules: [`docs/resume/RULES.md`](docs/resume/RULES.md)
- Golden templates: `assets/resume/templates/`
- Validate parser: `npm run validate:ats-template`
