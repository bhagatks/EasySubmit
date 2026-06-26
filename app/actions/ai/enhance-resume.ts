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
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import type { AiReadinessErrorCode } from "@/lib/ai/ai-readiness-gate-for-user";
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

function mapReadinessPreflightCode(
  code: AiReadinessErrorCode,
  systemQuotaCode: "quota_enhancement" | "quota_calls" | null,
): NonNullable<EnhanceResumeProfileFailure["code"]> {
  if (code === "quota_exhausted") {
    return systemQuotaCode ?? "quota_enhancement";
  }
  if (code === "key_missing") {
    return "no_customer_key";
  }
  return "provider_error";
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
      select: SYSTEM_QUOTA_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    return { ok: false, error: "Account not found.", code: "unauthorized" };
  }

  const systemAiEnabled = isSystemAiEnabled(featureFlags);

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

  const readiness = await getAiReadinessForUser(userId, {
    forceSystem,
    estimatedCalls: 1,
  });

  if (!readiness.status.ok) {
    return {
      ok: false,
      error: readiness.status.message,
      code: mapReadinessPreflightCode(readiness.status.code, readiness.systemQuota.code),
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

  if (!["auto", "customer", "system"].includes(preference)) {
    return { success: false, error: "Invalid AI source preference." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiSourcePreference: preference },
  });

  return { success: true };
}
