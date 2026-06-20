# Postgres Table Inventory

Living audit of every table in Supabase / Postgres. **Update this file in the same change** whenever you add, remove, or change how a Prisma model is read or written.

Last audited: **2026-06-20** (schema consolidation migration `20260620120000_consolidate_profile_schema`).

## Quick summary

| Status | Count | Tables |
|--------|------:|--------|
| **Active** | 7 | `users`, `accounts`, `profiles`, `user_api_keys`, `usage_logs`, `app_config`, `_prisma_migrations` |
| **Adapter (NextAuth)** | 2 | `sessions`, `verification_tokens` |
| **Removed** | 5 | `architectures`, `experiences`, `projects`, `educations`, `certifications` |

---

## Maintenance rule

When you touch `prisma/schema.prisma` or add/remove Prisma queries:

1. Update the row for that table below.
2. Bump **Last audited** date at the top.
3. Add a one-line note to [`database-schema.md`](./database-schema.md) changelog if behavior changed.

---

## Table reference

### `_prisma_migrations`

Prisma internal — migration history. Never drop.

### `users`

Auth identity, onboarding gate, BYOK pointers (`vaultKeyId`, `activeProvider`).

### `accounts` / `sessions` / `verification_tokens`

NextAuth Prisma adapter. JWT sessions use cookies at runtime; `sessions` / `verification_tokens` often empty with OAuth-only providers.

### `profiles`

**Single table for each resume profile** (many per user, one `isDefault`).

| Column group | Fields |
|--------------|--------|
| Identity | `firstName`, `lastName`, `email`, `phone`, `city`, `country`, `targetTitle` |
| Resume scalars | `summary`, `skills[]`, `resumeRawText` |
| Structured resume | `content` JSONB — experiences, education, certifications, projects, languages, custom sections |
| Engine | `calibrationScore` |

**Removed columns (2026-06-20):** `minSalary`, `workMode`, `coreCompetencies`.

**Write paths:** `completeOnboarding`, `saveResumeProfileStudio`, `saveProfile` (legacy), OAuth seed profile.

**Read paths:** Studio editor, dashboard preview/stats, AI engine refinement.

### `user_api_keys`

BYOK metadata — vault UUID pointers only.

### `usage_logs`

Per-request AI cost ledger. **Kept.**

### `app_config`

Global runtime config (`dataRefresh`, `aiConfig`, `ai_pricing_map`).

---

## Removed tables (2026-06-20)

| Table | Replaced by |
|-------|-------------|
| `architectures` | `profiles.content` + `profiles.calibrationScore` |
| `experiences`, `projects`, `educations`, `certifications` | `profiles.content` JSONB |
| `engines` (earlier) | `profiles.content` |

Fresh-start migration — no data backfill.
