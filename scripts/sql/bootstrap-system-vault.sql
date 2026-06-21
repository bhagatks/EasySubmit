-- =============================================================================
-- STEP 1 — Bootstrap system Vault (run ONCE before vault-system-gemini-keys.sql)
-- =============================================================================
-- Supabase Dashboard → SQL Editor → Run this entire file
--
-- Creates: vault_system_key(), unvault_system_key(), revoke_system_key()
--          system_api_keys table, users.aiDailyUnlimited column
-- Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).
-- When prompted about RLS → choose "Run and enable RLS"
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vault_system_key(slot_val INT, raw_key TEXT)
RETURNS UUID AS $$
DECLARE
  secret_id UUID;
  secret_name TEXT;
  secret_description TEXT;
  existing_id UUID;
BEGIN
  secret_name := 'easysubmit-system-gemini-' || slot_val::text;
  secret_description := 'EasySubmit system Gemini key slot ' || slot_val::text;

  SELECT id INTO existing_id
  FROM vault.secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, raw_key, secret_name, secret_description);
    RETURN existing_id;
  END IF;

  secret_id := vault.create_secret(raw_key, secret_name, secret_description);
  RETURN secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

CREATE OR REPLACE FUNCTION public.unvault_system_key(slot_val INT)
RETURNS TEXT AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT ds.decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'easysubmit-system-gemini-' || slot_val::text
  LIMIT 1;

  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

CREATE OR REPLACE FUNCTION public.revoke_system_key(secret_id_val UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE id = secret_id_val
    AND name LIKE 'easysubmit-system-gemini-%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

CREATE TABLE IF NOT EXISTS "system_api_keys" (
    "slot" INTEGER NOT NULL,
    "vaultSecretId" UUID NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_api_keys_pkey" PRIMARY KEY ("slot")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_api_keys_vaultSecretId_key"
  ON "system_api_keys"("vaultSecretId");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiDailyUnlimited" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "system_api_keys" ENABLE ROW LEVEL SECURITY;

-- Verify functions were created (should return 3 rows)
SELECT proname AS function_name
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND proname IN ('vault_system_key', 'unvault_system_key', 'revoke_system_key')
ORDER BY proname;
