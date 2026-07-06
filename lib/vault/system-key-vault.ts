import { prisma } from "@/lib/prisma";
import { slotLabelForIndex } from "@/src/lib/ai/engine/pool-constants";
import { getTodayPacificDateString } from "@/src/lib/ai/engine/pacific-time";
import {
  defaultBillingModeForSlot,
  defaultSlotModelForProvider,
  defaultSlotProviderForIndex,
  parseSystemPoolProvider,
  type SystemPoolProvider,
} from "@/src/lib/ai/engine/system-model-defaults";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";

type VaultSystemKeyRow = { vault_system_key: string };

/**
 * Store a system pool API key in Supabase Vault (slot 0 = OpenRouter, slot 1 = DeepSeek).
 * Secret name: `easysubmit-system-gemini-{slot}` (legacy vault function naming).
 */
export async function vaultSystemApiKey(
  slot: number,
  rawKey: string,
  options?: {
    label?: string;
    enabled?: boolean;
    provider?: SystemPoolProvider;
    modelId?: string;
  },
): Promise<{ slot: number; vaultSecretId: string }> {
  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    throw new Error("API key is required");
  }

  if (slot < 0 || slot >= AI_ENGINE_DEFAULTS.system.maxKeySlots) {
    throw new Error(`Slot must be between 0 and ${AI_ENGINE_DEFAULTS.system.maxKeySlots - 1}`);
  }

  const rows = await prisma.$queryRaw<VaultSystemKeyRow[]>`
    SELECT public.vault_system_key(${slot}, ${trimmedKey})::text AS vault_system_key
  `;

  const vaultSecretId = rows[0]?.vault_system_key;
  if (!vaultSecretId) {
    throw new Error("Failed to vault system API key");
  }

  const provider = parseSystemPoolProvider(
    options?.provider,
    defaultSlotProviderForIndex(slot),
  );
  const billingMode = defaultBillingModeForSlot(slot);
  const modelId =
    options?.modelId?.trim() || defaultSlotModelForProvider(provider, slot);

  await prisma.systemApiKey.upsert({
    where: { slot },
    create: {
      slot,
      vaultSecretId,
      label: options?.label?.trim() || slotLabelForIndex(slot),
      enabled: options?.enabled ?? true,
      provider,
      billingMode,
      modelId,
      callsToday: 0,
      quotaResetDate: getTodayPacificDateString(),
    },
    update: {
      vaultSecretId,
      provider,
      billingMode,
      modelId,
      ...(options?.label !== undefined ? { label: options.label.trim() || undefined } : {}),
      ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    },
  });

  return { slot, vaultSecretId };
}

/** Server-only: decrypt a system key by slot. */
export async function unvaultSystemApiKey(slot: number): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ unvault_system_key: string | null }[]>`
    SELECT public.unvault_system_key(${slot}) AS unvault_system_key
  `;
  const secret = rows[0]?.unvault_system_key?.trim();
  return secret || null;
}

export async function revokeSystemApiKey(slot: number): Promise<void> {
  const row = await prisma.systemApiKey.findUnique({ where: { slot } });
  if (!row) return;

  await prisma.$executeRaw`
    SELECT public.revoke_system_key(${row.vaultSecretId}::uuid)
  `;
  await prisma.systemApiKey.delete({ where: { slot } });
}
