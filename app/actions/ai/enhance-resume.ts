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
  baselineAvailable: true;
  /** False when global AI is off or user disabled AI — rules-only enhance still allowed. */
  aiAvailable: boolean;
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

  if (!enhance.aiAvailable) {
    const featureFlags = await getFeatureFlags();
    return {
      ok: true,
      baselineAvailable: true,
      systemAiEnabled: isSystemAiEnabled(featureFlags),
      aiAvailable: false,
    };
  }

  const featureFlags = await getFeatureFlags();
  return {
    ok: true,
    baselineAvailable: true,
    systemAiEnabled: isSystemAiEnabled(featureFlags),
    aiAvailable: true,
  };
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

export type EnhanceOnboardingInput = {
  form: import("@/lib/onboarding/hubResume").HubRefineryForm;
  targetRole: string;
};

export type EnhanceOnboardingResult =
  | {
      success: true;
      form: import("@/lib/onboarding/hubResume").HubRefineryForm;
      skillsAdded: string[];
      bulletsRewritten: number;
      summary: string;
    }
  | { success: false; error: string };

export async function enhanceResumeOnboarding(
  input: EnhanceOnboardingInput,
): Promise<EnhanceOnboardingResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Sign in required." };

  const { createEnhanceTraceId } = await import("@/src/lib/ai/engine/enhance-logger");
  const { runResumeEnhancePipeline } = await import("@/lib/job-tracker/enhance/run-resume-enhance-pipeline");
  const { prisma } = await import("@/lib/prisma");
  const { SYSTEM_QUOTA_USER_SELECT } = await import("@/lib/ai/system-quota-gate-for-user");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SYSTEM_QUOTA_USER_SELECT });

  if (!user) return { success: false, error: "User not found." };

  const traceId = createEnhanceTraceId();

  const result = await runResumeEnhancePipeline({
    userId,
    user,
    form: input.form,
    targetRole: input.targetRole,
    surface: "onboarding",
    variant: "onboarding",
    traceId,
    allowAiUpgrade: false,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    form: result.form,
    skillsAdded: result.skillsAdded,
    bulletsRewritten: result.brief.experience.weakBullets.length,
    summary: result.enhanceSummary,
  };
}
