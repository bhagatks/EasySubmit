-- Supabase Vault BYOK: store provider API keys outside public schema.
-- Requires Supabase Postgres (pgsodium + supabase_vault). Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Move a raw BYOK key into vault.secrets; replaces any prior secret for the same user+provider.
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

-- Read a vaulted BYOK key for server-side AI calls (never expose to the client).
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

-- Remove a vaulted secret by id (scoped to the owning user prefix).
CREATE OR REPLACE FUNCTION public.revoke_user_key(user_id_val TEXT, secret_id_val UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE id = secret_id_val
    AND name LIKE user_id_val || '-%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions;

-- CreateTable
CREATE TABLE "user_api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "vaultSecretId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_api_keys_vaultSecretId_key" ON "user_api_keys"("vaultSecretId");

-- CreateIndex
CREATE UNIQUE INDEX "user_api_keys_userId_provider_key" ON "user_api_keys"("userId", "provider");

-- CreateIndex
CREATE INDEX "user_api_keys_userId_idx" ON "user_api_keys"("userId");

-- AddForeignKey
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
