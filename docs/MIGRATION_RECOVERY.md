# Database migration recovery (P3009)

## What happened

Prisma error **P3009** means a migration is stuck in **failed** state in `_prisma_migrations`. Prisma will not apply any new migration until that is cleared.

Your failed migration:

| Field | Value |
|-------|--------|
| Name | `20260618043606_init` |
| Error | `relation "users" already exists` (Postgres `42P07`) |

**Cause:** `migrate deploy` tried to run the **init** migration, but tables like `users` were **already in the database** (from an earlier partial migrate, `db push`, or manual setup). Prisma recorded init as **failed** and blocked everything after it — including **`vault_user_key`**, which is why Ignition Gate could validate your key but not save it.

Your app tables (`profiles`, `architectures`, `user_api_keys`, etc.) are largely already present; only **migration history** and **vault SQL functions** are out of sync.

---

## Fix (recommended order)

### Step 1 — Clear the failed migration flag

Mark init as applied (tables already exist):

```bash
npx prisma migrate resolve --applied 20260618043606_init
```

### Step 2 — Apply remaining migrations

```bash
npm run db:migrate
```

If a later migration fails with **“already exists”**, mark that migration applied and continue:

```bash
npx prisma migrate resolve --applied <migration_folder_name>
npm run db:migrate
```

Repeat until `migrate deploy` reports success.

### Step 3 — If vault functions are still missing or crypto permission errors

If Ignition errors with `vault_user_key does not exist` **or** `permission denied for function _crypto_aead_det_noncegen`, re-apply the vault SQL (uses `vault.create_secret`, not direct `INSERT`):

```bash
npx prisma db execute --file scripts/vault-functions-only.sql
```

Or paste `scripts/vault-functions-only.sql` into **Supabase → SQL Editor → Run**.

### Step 4 — Verify

```bash
npx prisma migrate status
```

Should show: **Database schema is up to date.**

Then retry **Validate** in Ignition Gate.

---

## Inspect state (optional)

```bash
export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
npx tsx scripts/check-migration-state.ts
```

Shows `_prisma_migrations` rows, public tables, and whether vault functions exist.

---

## Do not use in production without care

- `migrate resolve --applied` tells Prisma “trust me, this migration ran” — only use when the DB already matches that migration.
- Never use `migrate reset` on a Supabase project you care about (drops data).
