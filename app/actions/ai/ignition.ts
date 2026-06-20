"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createEphemeralSecret,
  readEphemeralSecret,
  scrubEphemeralSecret,
} from "@/lib/vault/scrub-secret";
import { verifyApiKeyWithAiSdk } from "@/src/lib/ai/ai-sdk-handshake";
import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import {
  ENGINE_ERRORS,
  formatEngineTerminalError,
  mapProviderFailureToEngineError,
} from "@/src/lib/ai/engine-errors";
import {
  isHandshakeProvider,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";

import { vaultUserApiKey } from "@/lib/vault/user-key-vault";

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
 * Ignition Gate vault flow: verify BYOK via Vercel AI SDK, vault in Supabase,
 * persist `user.vaultKeyId`, and return unlock status for the right panel.
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

    const sdkVerify = await verifyApiKeyWithAiSdk(provider, keyMaterial);
    if (!sdkVerify.ok) {
      const err = mapProviderFailureToEngineError(sdkVerify.code, sdkVerify.message);
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

    return {
      success: true,
      unlocked: true,
      provider: discovery.provider,
      providerLabel: discovery.providerLabel,
      models: discovery.models,
      suggestedPrimaryFuel: discovery.suggestedPrimaryFuel,
      discoveredAt: discovery.discoveredAt,
    };
  } catch {
    const err = formatEngineTerminalError(
      ENGINE_ERRORS.PROVIDER_ERROR,
      "Ignition vault failed. Retry in a moment.",
    );
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
