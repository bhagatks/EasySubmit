/** Detect missing Supabase Vault SQL from Prisma raw-query failures. */
export function isVaultSchemaMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /vault_user_key.*does not exist/i.test(message) ||
    /unvault_user_key.*does not exist/i.test(message) ||
    /revoke_user_key.*does not exist/i.test(message) ||
    /relation "user_api_keys" does not exist/i.test(message) ||
    /schema "vault" does not exist/i.test(message) ||
    /extension "supabase_vault" does not exist/i.test(message) ||
    /_crypto_aead_det_noncegen/i.test(message) ||
    /permission denied for function _crypto/i.test(message)
  );
}

export const VAULT_SETUP_MESSAGE =
  "Supabase Vault functions need updating. Run: npx prisma db execute --file scripts/vault-functions-only.sql";
