"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createEphemeralSecret,
  readEphemeralSecret,
  scrubEphemeralSecret,
} from "@/lib/vault/scrub-secret";
import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import {
  ENGINE_ERRORS,
  formatEngineTerminalError,
} from "@/src/lib/ai/engine-errors";
import {
  isHandshakeProvider,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";

import { vaultUserApiKey } from "@/lib/vault/user-key-vault";
import { refreshProviderModelHealth } from "@/lib/ai/model-health/refresh-provider-model-health";
import {
  isVaultSchemaMissingError,
  VAULT_SETUP_MESSAGE,
} from "@/lib/vault/vault-schema-error";

export type IgniteEngineVaultInput = {
  rawKey: string;
  provider: string;
  /** When false, vault the key without switching the user's active BYOK pointer. */
  setAsActive?: boolean;
};

export type IgniteEngineVaultSuccess = {
  success: true;
  unlocked: true;
  provider: HandshakeProvider;
  providerLabel: string;
  models: string[];
  suggestedPrimaryFuel: string;
  discoveredAt: number;
};

export type IgniteEngineVaultFailure = {
  success: false;
  unlocked: false;
  error: string;
  terminalLine?: string;
  code?: string;
};

export type IgniteEngineVaultResult =
  | IgniteEngineVaultSuccess
  | IgniteEngineVaultFailure;

/**
 * Ignition Gate vault flow: BYOK handshake (provider model list + career-grade filter),
 * vault in Supabase, persist `user.vaultKeyId`, and return unlock status.
 *
 * Does not call generateContent for verify — that burned Gemini free-tier quota and
 * duplicated the models-list handshake that already proves key validity.
 */
export async function igniteEngineVault(
  input: IgniteEngineVaultInput,
): Promise<IgniteEngineVaultResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    const err = formatEngineTerminalError(ENGINE_ERRORS.UNAUTHORIZED);
    return {
      success: false,
      unlocked: false,
      error: err.message,
      terminalLine: err.terminalLine,
      code: err.code,
    };
  }

  if (!isHandshakeProvider(input.provider)) {
    const err = formatEngineTerminalError(ENGINE_ERRORS.INVALID_PROVIDER);
    return {
      success: false,
      unlocked: false,
      error: err.message,
      terminalLine: err.terminalLine,
      code: err.code,
    };
  }

  const provider = input.provider;
  const secret = createEphemeralSecret(input.rawKey);

  try {
    const keyMaterial = readEphemeralSecret(secret);
    if (!keyMaterial) {
      const err = formatEngineTerminalError(ENGINE_ERRORS.MISSING_KEY);
      return {
        success: false,
        unlocked: false,
        error: err.message,
        terminalLine: err.terminalLine,
        code: err.code,
      };
    }

    const discovery = await performEngineHandshake({ provider, apiKey: keyMaterial });
    if (!discovery.success) {
      return {
        success: false,
        unlocked: false,
        error: discovery.error.message,
        terminalLine: discovery.error.terminalLine,
        code: discovery.error.code,
      };
    }

    await vaultUserApiKey(userId, provider, keyMaterial, {
      setAsActive: input.setAsActive ?? true,
    });

    try {
      await refreshProviderModelHealth({
        userId,
        provider,
        apiKey: keyMaterial,
        traceId: `ignite-${provider}`,
      });
    } catch (healthError) {
      console.warn("[Ignition] model health refresh failed", {
        provider,
        message: healthError instanceof Error ? healthError.message : String(healthError),
      });
    }

    return {
      success: true,
      unlocked: true,
      provider: discovery.provider,
      providerLabel: discovery.providerLabel,
      models: discovery.models,
      suggestedPrimaryFuel: discovery.suggestedPrimaryFuel,
      discoveredAt: discovery.discoveredAt,
    };
  } catch (error) {
    if (isVaultSchemaMissingError(error)) {
      const err = formatEngineTerminalError(
        ENGINE_ERRORS.VAULT_NOT_CONFIGURED,
        VAULT_SETUP_MESSAGE,
      );
      return {
        success: false,
        unlocked: false,
        error: err.message,
        terminalLine: err.terminalLine,
        code: err.code,
      };
    }

    const detail =
      error instanceof Error
        ? error.message
        : "Ignition vault failed. Retry in a moment.";
    const err = formatEngineTerminalError(ENGINE_ERRORS.PROVIDER_ERROR, detail);
    return {
      success: false,
      unlocked: false,
      error: err.message,
      terminalLine: err.terminalLine,
      code: err.code,
    };
  } finally {
    scrubEphemeralSecret(secret);
  }
}
