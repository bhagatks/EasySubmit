import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";

export type ReconciledVaultKeyState = {
  vaultKeyId: string | null;
  activeProvider: string | null;
  changed: boolean;
};

/** Align `users.vaultKeyId` / `activeProvider` with `user_api_keys` rows. */
export async function reconcileUserVaultKeyState(
  userId: string,
): Promise<ReconciledVaultKeyState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultKeyId: true, activeProvider: true },
  });

  if (!user) {
    return { vaultKeyId: null, activeProvider: null, changed: false };
  }

  const keys = await prisma.userApiKey.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { vaultSecretId: true, provider: true },
  });

  if (keys.length === 0) {
    if (!user.vaultKeyId && !user.activeProvider) {
      return { vaultKeyId: null, activeProvider: null, changed: false };
    }
    await prisma.user.update({
      where: { id: userId },
      data: { vaultKeyId: null, activeProvider: null },
    });
    logEnhance("server", "vault.reconcile.cleared", {
      userId,
      reason: "no_api_key_rows",
      previousVaultKeyId: user.vaultKeyId,
      previousActiveProvider: user.activeProvider,
    });
    return { vaultKeyId: null, activeProvider: null, changed: true };
  }

  const vaultMatch = user.vaultKeyId
    ? keys.find((row) => row.vaultSecretId === user.vaultKeyId)
    : null;
  const providerMatch = user.activeProvider
    ? keys.find((row) => row.provider === user.activeProvider)
    : null;

  if (
    vaultMatch &&
    providerMatch &&
    vaultMatch.vaultSecretId === providerMatch.vaultSecretId
  ) {
    return {
      vaultKeyId: user.vaultKeyId,
      activeProvider: user.activeProvider,
      changed: false,
    };
  }

  const fallback = vaultMatch ?? providerMatch ?? keys[0]!;

  if (
    user.vaultKeyId === fallback.vaultSecretId &&
    user.activeProvider === fallback.provider
  ) {
    return {
      vaultKeyId: user.vaultKeyId,
      activeProvider: user.activeProvider,
      changed: false,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      vaultKeyId: fallback.vaultSecretId,
      activeProvider: fallback.provider,
    },
  });
  logEnhance("server", "vault.reconcile.updated", {
    userId,
    reason: vaultMatch ? "active_provider_mismatch" : "orphan_vault_key_id",
    previousVaultKeyId: user.vaultKeyId,
    previousActiveProvider: user.activeProvider,
    vaultKeyId: fallback.vaultSecretId,
    activeProvider: fallback.provider,
  });

  return {
    vaultKeyId: fallback.vaultSecretId,
    activeProvider: fallback.provider,
    changed: true,
  };
}
