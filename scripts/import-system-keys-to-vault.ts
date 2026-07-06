#!/usr/bin/env npx tsx
/**
 * Import system pool keys from env into Supabase Vault + system_api_keys.
 *
 * Pool v2 (default):
 *   slot 0 — OpenRouter free (`EASYSUBMIT_SYSTEM_OPENROUTER_API_KEY(S)`)
 *   slot 1 — DeepSeek paid overflow (`EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEY(S)`)
 *
 * Usage (local dev):
 *   npm run db:import-system-keys
 *
 * Usage (production — keys from Vercel, not laptop):
 *   node scripts/run.mjs admin -- npm run db:import-system-keys
 */
import dotenv from "dotenv";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  OPENROUTER_FREE_SLOT,
  slotLabelForIndex,
} from "../src/lib/ai/engine/pool-constants";
import {
  systemPoolEnvKeyVar,
  systemPoolEnvKeysVar,
  type SystemPoolProvider,
} from "../src/lib/ai/engine/system-model-defaults";

dotenv.config({ path: ".env" });
// Prod/admin ops set EASYSUBMIT_SKIP_LOCAL_ENV=1 so laptop dev DB never overrides injected prod env.
if (process.env.EASYSUBMIT_SKIP_LOCAL_ENV !== "1") {
  dotenv.config({ path: ".env.local" });
}

function firstEnvKey(provider: SystemPoolProvider): string {
  const plural = process.env[systemPoolEnvKeysVar(provider)]?.trim();
  const single = process.env[systemPoolEnvKeyVar(provider)]?.trim();
  const raw = plural?.split(",")[0]?.trim() || single || "";
  if (!raw) {
    throw new Error(
      `Set ${systemPoolEnvKeysVar(provider)} or ${systemPoolEnvKeyVar(provider)}`,
    );
  }
  return raw;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const openRouterKey = firstEnvKey("openrouter");
  const deepSeekKey = firstEnvKey("deepseek");

  const { vaultSystemApiKey } = await import("../lib/vault/system-key-vault");

  const slot0 = await vaultSystemApiKey(OPENROUTER_FREE_SLOT, openRouterKey, {
    label: slotLabelForIndex(OPENROUTER_FREE_SLOT),
    enabled: true,
    provider: "openrouter",
  });
  console.log(`Vaulted slot ${OPENROUTER_FREE_SLOT} OpenRouter (${slot0.vaultSecretId})`);

  const slot1 = await vaultSystemApiKey(DEEPSEEK_OVERFLOW_SLOT, deepSeekKey, {
    label: slotLabelForIndex(DEEPSEEK_OVERFLOW_SLOT),
    enabled: true,
    provider: "deepseek",
  });
  console.log(`Vaulted slot ${DEEPSEEK_OVERFLOW_SLOT} DeepSeek (${slot1.vaultSecretId})`);

  console.log(
    "\nDone — system pool v2 keys in Vault.\n" +
      "Verify: npx tsx scripts/diagnose-system-pool.ts\n" +
      "Prod:   node scripts/run.mjs admin -- npx tsx scripts/diagnose-system-pool.ts",
  );
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("vault_system_key") && message.includes("does not exist")) {
    console.error(
      "Vault SQL functions are missing. Run migrations first:\n  npx prisma migrate deploy",
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
