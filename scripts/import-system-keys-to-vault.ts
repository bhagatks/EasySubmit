#!/usr/bin/env npx tsx
/**
 * One-time (or repeatable) import of system Gemini keys from env into Supabase Vault.
 *
 * Usage:
 *   EASYSUBMIT_SYSTEM_GEMINI_API_KEYS=key1,key2 npm run db:import-system-keys
 *
 * Requires DATABASE_URL and Vault SQL functions from migration 20260621040000.
 */
import dotenv from "dotenv";
import { slotLabelForIndex } from "../src/lib/ai/engine/pool-constants";

dotenv.config({ path: ".env" });
// Shell-provided keys win over empty .env.local placeholders.
dotenv.config({ path: ".env.local" });

function parseKeys(): string[] {
  const raw =
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS?.trim() ||
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEY?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "Set EASYSUBMIT_SYSTEM_GEMINI_API_KEYS (comma-separated, up to 3) or EASYSUBMIT_SYSTEM_GEMINI_API_KEY",
    );
  }
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 3);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const { vaultSystemApiKey } = await import("../lib/vault/system-key-vault");
  const keys = parseKeys();

  for (let slot = 0; slot < keys.length; slot += 1) {
    const result = await vaultSystemApiKey(slot, keys[slot]!, {
      label: slotLabelForIndex(slot),
      enabled: true,
    });
    console.log(`Vaulted system key slot ${slot} (${result.vaultSecretId})`);
  }

  console.log(
    `\nDone — ${keys.length} key(s) in Vault.\n` +
      "Next: remove EASYSUBMIT_SYSTEM_GEMINI_API_KEYS from production env (see docs/database-schema.md).",
  );
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("vault_system_key") && message.includes("does not exist")) {
    console.error(
      "Vault SQL functions are missing. Run migrations first:\n  npx prisma migrate dev",
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
