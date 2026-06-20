"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasVaultedUserApiKey,
  listVaultedUserApiKeyProviders,
  listVaultedUserApiKeys,
  revokeUserApiKey,
  setActiveVaultedUserApiKey,
  vaultUserApiKey,
} from "@/lib/vault/user-key-vault";
import { getProviderRegistryEntry } from "@/src/lib/config/app.config";
import {
  isHandshakeProvider,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";

export type VaultedApiKeySummary = {
  id: string;
  provider: HandshakeProvider;
  providerLabel: string;
  vaultSecretId: string;
  vaultHint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VaultApiKeySuccess = {
  success: true;
  provider: HandshakeProvider;
  vaulted: true;
};

export type VaultApiKeyFailure = {
  success: false;
  error: string;
};

export type VaultApiKeyResult = VaultApiKeySuccess | VaultApiKeyFailure;

export type RevokeApiKeySuccess = {
  success: true;
  provider: HandshakeProvider;
};

export type RevokeApiKeyResult = RevokeApiKeySuccess | VaultApiKeyFailure;

function maskVaultHint(vaultSecretId: string): string {
  const compact = vaultSecretId.replace(/-/g, "");
  const tail = compact.slice(-4).toUpperCase();
  return `vault •••• ${tail}`;
}

/** List vaulted BYOK keys for the signed-in user (no raw secrets). */
export async function listVaultedApiKeys(): Promise<VaultedApiKeySummary[]> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  const [rows, user] = await Promise.all([
    listVaultedUserApiKeys(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { vaultKeyId: true, activeProvider: true },
    }),
  ]);

  return rows
    .filter((row) => isHandshakeProvider(row.provider))
    .map((row) => {
      const provider = row.provider as HandshakeProvider;
      return {
        id: row.id,
        provider,
        providerLabel: getProviderRegistryEntry(provider).label,
        vaultSecretId: row.vaultSecretId,
        vaultHint: maskVaultHint(row.vaultSecretId),
        isActive:
          user?.vaultKeyId === row.vaultSecretId &&
          user?.activeProvider === provider,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });
}

export async function setActiveVaultedApiKey(
  provider: string,
): Promise<VaultApiKeyResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!isHandshakeProvider(provider)) {
    return { success: false, error: "Unsupported provider" };
  }

  try {
    await setActiveVaultedUserApiKey(userId, provider);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/keys");
    return { success: true, provider, vaulted: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set active key";
    return { success: false, error: message };
  }
}

/** Persist BYOK in Supabase Vault after a successful ignition handshake. */
export async function saveVaultedApiKey(
  provider: string,
  rawKey: string,
  options?: { setAsActive?: boolean },
): Promise<VaultApiKeyResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!isHandshakeProvider(provider)) {
    return { success: false, error: "Unsupported provider" };
  }

  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    return { success: false, error: "API key is required" };
  }

  try {
    await vaultUserApiKey(userId, provider, trimmedKey, {
      setAsActive: options?.setAsActive ?? true,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/keys");
    return { success: true, provider, vaulted: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to vault API key";
    return { success: false, error: message };
  }
}

export async function getVaultedApiKeyProviders(): Promise<HandshakeProvider[]> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  return listVaultedUserApiKeyProviders(userId);
}

export async function checkVaultedApiKey(provider: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId || !isHandshakeProvider(provider)) {
    return false;
  }

  return hasVaultedUserApiKey(userId, provider);
}

export async function removeVaultedApiKey(
  provider: string,
): Promise<RevokeApiKeyResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!isHandshakeProvider(provider)) {
    return { success: false, error: "Unsupported provider" };
  }

  try {
    await revokeUserApiKey(userId, provider);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/keys");
    return { success: true, provider };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke API key";
    return { success: false, error: message };
  }
}
