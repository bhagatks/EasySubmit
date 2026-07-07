import { OPENROUTER_FREE_SLOT } from "@/src/lib/ai/engine/pool-constants";

export async function resolveSystemOpenRouterApiKey(): Promise<{
  apiKey: string;
  source: "env" | "vault";
}> {
  const fromEnv =
    process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEYS?.split(",")[0]?.trim() ??
    process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEY?.trim();
  if (fromEnv) return { apiKey: fromEnv, source: "env" };

  const { unvaultSystemApiKey } = await import("@/lib/vault/system-key-vault");
  const fromVault = await unvaultSystemApiKey(OPENROUTER_FREE_SLOT);
  if (fromVault) return { apiKey: fromVault, source: "vault" };

  throw new Error(
    "No OpenRouter key: set EASYSUBMIT_SYSTEM_OPENROUTER_API_KEY(S) or vault slot 0 (npm run db:import-system-keys).",
  );
}
