-- System AI keys in Supabase Vault (slots 0–4) + metadata table.

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

CREATE TABLE "system_api_keys" (
    "slot" INTEGER NOT NULL,
    "vaultSecretId" UUID NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_api_keys_pkey" PRIMARY KEY ("slot")
);

CREATE UNIQUE INDEX "system_api_keys_vaultSecretId_key" ON "system_api_keys"("vaultSecretId");

ALTER TABLE "users" ADD COLUMN "aiDailyUnlimited" BOOLEAN NOT NULL DEFAULT false;
