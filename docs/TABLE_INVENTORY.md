# Postgres Table Inventory

Living audit of every table in Supabase / Postgres. **Update this file in the same change** whenever you add, remove, or change how a Prisma model is read or written.

Last audited: **2026-06-21** (Job Tracker `job_tracker_entries` migration `20260621180000_job_tracker_entries`).

## Quick summary

| Status | Count | Tables |
|--------|------:|--------|
| **Active** | 9 | `users`, `accounts`, `profiles`, `user_api_keys`, `usage_logs`, `api_call_logs`, `job_tracker_entries`, `app_config`, `feature_flags`, `_prisma_migrations` |
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

### `job_tracker_entries`

Saved and applied roles for **Job Tracker** (extension + dashboard). One row per user + canonical job URL.

| Column group | Fields |
|--------------|--------|
| Identity | `canonicalUrl`, `urlHash` (dedupe), `title`, `company`, `location`, `salaryText` |
| Content | `description`, `platform`, `metadata` JSONB |
| Status | `status` (`CAPTURED`, `RESUME_READY`, `READY_TO_APPLY`, `APPLIED`, …), `savedAt`, `appliedAt`, `notes` |

**Write paths (planned):** extension `POST /api/extension/jobs`; dashboard status edits (v1.1).

**Read paths:** `/dashboard/job-tracker`, overview recent list, `getDashboardStats`.

### `usage_logs`

Per-request AI cost ledger. **Kept.**

### `app_config`

Global runtime config (`dataRefresh`, `aiEngine`, `ai_pricing_map`).

### `feature_flags`

Key/value rows (`key`, `enabled`, `description`) — add flags with `INSERT`, no new columns.

---

## Removed tables (2026-06-20)

| Table | Replaced by |
|-------|-------------|
| `architectures` | `profiles.content` + `profiles.calibrationScore` |
| `experiences`, `projects`, `educations`, `certifications` | `profiles.content` JSONB |
| `engines` (earlier) | `profiles.content` |

Fresh-start migration — no data backfill.
