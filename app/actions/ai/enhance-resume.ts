"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  enhanceResumeForUserId,
  type EnhanceResumeProfileFailure,
  type EnhanceResumeProfileInput,
  type EnhanceResumeProfileResult,
  type EnhanceResumeProfileSuccess,
} from "@/lib/ai/enhance-resume-for-user";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  buildQuotaSnapshot,
  checkAiQuota,
  quotaResetPatchIfNeeded,
  type AiQuotaMode,
  type QuotaCheckResult,
} from "@/src/lib/ai/engine/quota";
import { isSystemAiEnabled } from "@/src/lib/services/ai-engine-config";
import { resolveAiRoute, resolveEffectiveAiSource } from "@/src/lib/ai/engine/router";

export type {
  EnhanceResumeProfileFailure,
  EnhanceResumeProfileInput,
  EnhanceResumeProfileResult,
  EnhanceResumeProfileSuccess,
} from "@/lib/ai/enhance-resume-for-user";

export type EnhancePreflightInput = {
  variant?: "dashboard" | "onboarding";
  forceSystem?: boolean;
};

export type EnhancePreflightSuccess = {
  ok: true;
  systemAiEnabled: boolean;
};

export type EnhancePreflightFailure = {
  ok: false;
  error: string;
  code: NonNullable<EnhanceResumeProfileFailure["code"]>;
  requiresByokOnly?: boolean;
};

export type EnhancePreflightResult = EnhancePreflightSuccess | EnhancePreflightFailure;

function quotaBlockedMessage(
  check: Extract<QuotaCheckResult, { ok: false }>,
  mode: AiQuotaMode,
): string {
  const { snapshot } = check;
  if (check.reason === "enhancement_limit") {
    if (mode === "system") {
      return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Add your API key for more.`;
    }
    return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Try again tomorrow.`;
  }
  if (mode === "system") {
    return `Daily AI call limit reached (${snapshot.callsLimit}/day). Add your API key or try again tomorrow.`;
  }
  return `Daily AI call limit reached (${snapshot.callsLimit}/day). Try again tomorrow.`;
}

/** Validates feature flag, routing, and quota before opening the Enhance dialog. */
export async function checkEnhanceWithAiPreflight(
  input: EnhancePreflightInput = {},
): Promise<EnhancePreflightResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, error: "Sign in required.", code: "unauthorized" };
  }

  const variant = input.variant ?? "dashboard";
  const forceSystem = input.forceSystem ?? false;

  const [user, aiEngine, featureFlags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        vaultKeyId: true,
        activeProvider: true,
        aiSourcePreference: true,
        aiEnhancementsToday: true,
        aiCallsToday: true,
        aiQuotaResetAt: true,
      },
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    return { ok: false, error: "Account not found.", code: "unauthorized" };
  }

  const systemAiEnabled = isSystemAiEnabled(aiEngine);

  const enhanceEnabled =
    variant === "onboarding"
      ? featureFlags.enhanceWithAiOnboarding
      : featureFlags.enhanceWithAiResumeProfile;

  if (!enhanceEnabled) {
    return {
      ok: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  if (!systemAiEnabled) {
    if (!user.vaultKeyId) {
      return {
        ok: false,
        error: "EasySubmit AI is off — add your API key in AI Keys to use Enhance with AI.",
        code: "no_customer_key",
        requiresByokOnly: true,
      };
    }
  }

  const resetPatch = quotaResetPatchIfNeeded(user);
  const quotaRow = resetPatch ? { ...user, ...resetPatch } : user;

  const preference = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem,
    aiEngine,
  });

  if ("error" in route) {
    if (route.error === "no_system_key") {
      return {
        ok: false,
        error: "EasySubmit AI is not configured. Add your own API key in AI Keys.",
        code: "no_system_key",
      };
    }
    return {
      ok: false,
      error: systemAiEnabled
        ? "Add an API key in AI Keys or switch to EasySubmit AI in Settings."
        : "Add an API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
      requiresByokOnly: !systemAiEnabled,
    };
  }

  const quotaMode: AiQuotaMode = route.mode;
  const quotaCheck = checkAiQuota(quotaRow, aiEngine, quotaMode, {
    isEnhancement: true,
    estimatedCalls: 1,
  });

  if (!quotaCheck.ok) {
    return {
      ok: false,
      error: quotaBlockedMessage(quotaCheck, quotaMode),
      code:
        quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
    };
  }

  return { ok: true, systemAiEnabled };
}

export type AiQuotaSummary = {
  enhancementsUsed: number;
  enhancementsLimit: number;
  callsUsed: number;
  callsLimit: number;
  aiSourcePreference: AiSourcePreference;
  effectiveMode: "customer" | "system";
};

export async function getAiQuotaSummary(): Promise<AiQuotaSummary | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      aiSourcePreference: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
      aiQuotaResetAt: true,
      vaultKeyId: true,
    },
  });

  if (!user) return null;

  const aiEngine = await getAppConfig("aiEngine");
  const reset = quotaResetPatchIfNeeded(user);
  const row = reset ? { ...user, ...reset } : user;

  const pref = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const effectiveMode = resolveEffectiveAiSource(
    pref,
    Boolean(user.vaultKeyId),
    aiEngine,
    false,
  );

  const snapshot = buildQuotaSnapshot(row, aiEngine, effectiveMode);

  return {
    ...snapshot,
    aiSourcePreference: pref,
    effectiveMode,
  };
}

export async function enhanceResumeProfile(
  input: EnhanceResumeProfileInput,
): Promise<EnhanceResumeProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required.", code: "unauthorized" };
  }

  return enhanceResumeForUserId(userId, input);
}

export async function updateAiSourcePreference(
  preference: AiSourcePreference,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  if (!["auto", "customer", "system"].includes(preference)) {
    return { success: false, error: "Invalid AI source preference." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiSourcePreference: preference },
  });

  return { success: true };
}
