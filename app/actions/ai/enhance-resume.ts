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
import { resolveFeature } from "@/lib/features";
import { getAppConfig } from "@/src/lib/services/config-service";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  buildQuotaSnapshot,
  quotaResetPatchIfNeeded,
} from "@/src/lib/ai/engine/quota";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { resolveEffectiveAiSource } from "@/src/lib/ai/engine/router";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";

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

/** Validates feature flag, routing, and quota before opening the Enhance dialog. */
export async function checkEnhanceWithAiPreflight(
  input: EnhancePreflightInput = {},
): Promise<EnhancePreflightResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, error: "Sign in required.", code: "unauthorized" };
  }

  const surface = input.variant === "onboarding" ? "onboarding" : "job_apply";

  const enhance = await resolveFeature({
    feature: "enhance",
    userId,
    surface,
  });

  if (!enhance.available) {
    const codeMap: Record<string, NonNullable<EnhanceResumeProfileFailure["code"]>> = {
      globally_disabled: "feature_disabled",
      feature_disabled: "feature_disabled",
      user_disabled: "feature_disabled",
      no_key: "no_customer_key",
      pool_down: "system_pool_exhausted",
      quota_exceeded: "quota_enhancement",
    };

    const requiresByokOnly = enhance.reason === "no_key";

    return {
      ok: false,
      error:
        enhance.reason === "feature_disabled"
          ? "Enhance with AI is not available right now."
          : enhance.reason === "no_key"
            ? "EasySubmit AI is off — add your API key in AI Keys to use Enhance with AI."
            : enhance.reason === "pool_down"
              ? "EasySubmit's shared AI is temporarily unavailable."
              : enhance.reason === "quota_exceeded"
                ? "Daily enhancement limit reached. Try again tomorrow."
                : "Enhance with AI is not available right now.",
      code: codeMap[enhance.reason ?? ""] ?? "feature_disabled",
      ...(requiresByokOnly ? { requiresByokOnly: true } : {}),
    };
  }

  const featureFlags = await getFeatureFlags();
  return { ok: true, systemAiEnabled: isSystemAiEnabled(featureFlags) };
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

  const [aiEngine, featureFlags] = await Promise.all([
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);
  const reset = quotaResetPatchIfNeeded(user);
  const row = reset ? { ...user, ...reset } : user;

  const pref = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const effectiveMode = resolveEffectiveAiSource(
    pref,
    Boolean(user.vaultKeyId),
    isSystemAiEnabled(featureFlags),
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

  if (!["auto", "customer", "system", "disabled"].includes(preference)) {
    return { success: false, error: "Invalid AI source preference." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiSourcePreference: preference },
  });

  return { success: true };
}
