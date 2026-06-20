-- Supabase Vault BYOK helpers — use official Vault API (direct INSERT breaks on modern Supabase).
-- Run in Supabase SQL Editor or: npx prisma db execute --file scripts/vault-functions-only.sql
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE OR REPLACE FUNCTION public.vault_user_key(user_id_val TEXT, raw_key TEXT, provider_name TEXT)
RETURNS UUID AS $$
DECLARE
  secret_id UUID;
  secret_name TEXT;
  secret_description TEXT;
  existing_id UUID;
BEGIN
  secret_name := user_id_val || '-' || provider_name;
  secret_description := 'BYOK for ' || provider_name;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault, extensions;

CREATE OR REPLACE FUNCTION public.unvault_user_key(user_id_val TEXT, provider_name TEXT)
RETURNS TEXT AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT ds.decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets ds
  WHERE ds.name = user_id_val || '-' || provider_name
  LIMIT 1;

  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault, extensions;

CREATE OR REPLACE FUNCTION public.revoke_user_key(user_id_val TEXT, secret_id_val UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE id = secret_id_val
    AND name LIKE user_id_val || '-%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault, extensions;

ALTER FUNCTION public.vault_user_key(TEXT, TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.unvault_user_key(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.revoke_user_key(TEXT, UUID) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.vault_user_key(TEXT, TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.unvault_user_key(TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.revoke_user_key(TEXT, UUID) TO postgres;
