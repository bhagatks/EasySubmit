import { prisma } from "@/lib/prisma";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";

type VaultUserKeyRow = { vault_user_key: string };

type UnvaultUserKeyRow = { unvault_user_key: string | null };

/**
 * Store a BYOK API key in Supabase Vault and persist the secret id on `user_api_keys`.
 * Replaces any existing vaulted key for the same user + provider.
 */
export async function vaultUserApiKey(
  userId: string,
  provider: HandshakeProvider,
  rawKey: string,
  options?: { setAsActive?: boolean },
): Promise<{ vaultSecretId: string }> {
  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    throw new Error("API key is required");
  }

  const rows = await prisma.$queryRaw<VaultUserKeyRow[]>`
    SELECT public.vault_user_key(${userId}, ${trimmedKey}, ${provider})::text AS vault_user_key
  `;

  const vaultSecretId = rows[0]?.vault_user_key;
  if (!vaultSecretId) {
    throw new Error("Failed to vault API key");
  }

  await prisma.userApiKey.upsert({
    where: {
      userId_provider: { userId, provider },
    },
    create: {
      userId,
      provider,
      vaultSecretId,
    },
    update: {
      vaultSecretId,
    },
  });

  const shouldSetActive = options?.setAsActive ?? true;

  if (shouldSetActive) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        vaultKeyId: vaultSecretId,
        activeProvider: provider,
      },
    });
  } else {
    const activeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProvider: true },
    });
    if (activeUser?.activeProvider === provider) {
      await prisma.user.update({
        where: { id: userId },
        data: { vaultKeyId: vaultSecretId },
      });
    }
  }

  return { vaultSecretId };
}

/** Read a vaulted BYOK key for server-side AI calls only — never return to the browser. */
export async function unvaultUserApiKey(
  userId: string,
  provider: HandshakeProvider,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<UnvaultUserKeyRow[]>`
    SELECT public.unvault_user_key(${userId}, ${provider}) AS unvault_user_key
  `;

  const key = rows[0]?.unvault_user_key?.trim();
  return key || null;
}

export async function hasVaultedUserApiKey(
  userId: string,
  provider: HandshakeProvider,
): Promise<boolean> {
  const row = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listVaultedUserApiKeyProviders(
  userId: string,
): Promise<HandshakeProvider[]> {
  const rows = await prisma.userApiKey.findMany({
    where: { userId },
    select: { provider: true },
  });

  return rows.map((row) => row.provider as HandshakeProvider);
}

export type VaultedApiKeyRecord = {
  id: string;
  provider: HandshakeProvider;
  vaultSecretId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ActiveVaultKeyLookup = {
  vaultKeyId: string | null;
  activeProvider: string | null;
};

/** When the active vaulted key was last written — stale failures before this are ignored. */
export async function getActiveVaultKeyUpdatedAt(
  userId: string,
  lookup: ActiveVaultKeyLookup | string | null,
): Promise<Date | null> {
  const vaultKeyId = typeof lookup === "object" && lookup !== null ? lookup.vaultKeyId : lookup;
  const activeProvider =
    typeof lookup === "object" && lookup !== null ? lookup.activeProvider : null;

  if (activeProvider) {
    const activeRow = await prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: activeProvider } },
      select: { updatedAt: true },
    });
    if (activeRow) return activeRow.updatedAt;
  }

  if (!vaultKeyId) return null;

  const row = await prisma.userApiKey.findFirst({
    where: { userId, vaultSecretId: vaultKeyId },
    select: { updatedAt: true },
  });

  return row?.updatedAt ?? null;
}

export async function listVaultedUserApiKeys(userId: string) {
  return prisma.userApiKey.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      vaultSecretId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function setActiveVaultedUserApiKey(
  userId: string,
  provider: HandshakeProvider,
): Promise<void> {
  const row = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { vaultSecretId: true },
  });

  if (!row) {
    throw new Error("Vaulted API key not found for provider");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      vaultKeyId: row.vaultSecretId,
      activeProvider: provider,
    },
  });
}

/** Delete vaulted secret + metadata row for a provider. */
export async function revokeUserApiKey(
  userId: string,
  provider: HandshakeProvider,
): Promise<void> {
  const existing = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { vaultSecretId: true },
  });

  if (!existing) {
    return;
  }

  await prisma.$executeRaw`
    SELECT public.revoke_user_key(${userId}, ${existing.vaultSecretId}::uuid)
  `;

  await prisma.userApiKey.delete({
    where: { userId_provider: { userId, provider } },
  });

  const activeUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultKeyId: true, activeProvider: true },
  });

  if (
    activeUser?.activeProvider === provider &&
    activeUser.vaultKeyId === existing.vaultSecretId
  ) {
    const fallback = await prisma.userApiKey.findFirst({
      where: { userId, NOT: { provider } },
      orderBy: { updatedAt: "desc" },
      select: { vaultSecretId: true, provider: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: fallback
        ? {
            vaultKeyId: fallback.vaultSecretId,
            activeProvider: fallback.provider,
          }
        : {
            vaultKeyId: null,
            activeProvider: null,
          },
    });
  }

}
