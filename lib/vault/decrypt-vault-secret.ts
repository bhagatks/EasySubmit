import { prisma } from "@/lib/prisma";
import {
  createEphemeralSecret,
  readEphemeralSecret,
  scrubEphemeralSecret,
} from "@/lib/vault/scrub-secret";

export const VAULT_DECRYPT_USER_MESSAGE =
  "Could not decrypt your API key. Update it in AI Keys.";

type DecryptedSecretRow = { decrypted_secret: string | null };

/**
 * Read a vaulted BYOK secret by vault secret id — server-only, never expose to client.
 */
export async function fetchVaultDecryptedSecret(
  vaultKeyId: string,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<DecryptedSecretRow[]>`
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE id = ${vaultKeyId}::uuid
    LIMIT 1
  `;

  const secret = rows[0]?.decrypted_secret?.trim();
  return secret || null;
}

/**
 * Fetch and hold the decrypted secret in an ephemeral ref for the duration of `fn`.
 * Scrubs the ref when complete — raw key never leaves the server action response.
 */
export async function withVaultDecryptedSecret<T>(
  vaultKeyId: string,
  fn: (apiKey: string) => Promise<T>,
): Promise<{ ok: true; result: T } | { ok: false; reason: "VAULT_LOCK" }> {
  const raw = await fetchVaultDecryptedSecret(vaultKeyId);
  const secret = createEphemeralSecret(raw ?? "");

  try {
    const apiKey = readEphemeralSecret(secret);
    if (!apiKey) {
      return { ok: false, reason: "VAULT_LOCK" };
    }

    const result = await fn(apiKey);
    return { ok: true, result };
  } finally {
    scrubEphemeralSecret(secret);
  }
}
