import { prisma } from "@/lib/prisma";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  evaluateCombinedSystemQuotaGate,
  evaluateSystemQuotaGate,
  resolveQuotaRowWithReset,
  systemQuotaGateNotApplicable,
  type SystemQuotaGateOptions,
  type SystemQuotaGateResult,
  type SystemQuotaUserRow,
} from "@/src/lib/ai/engine/system-quota-gate";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";

/** Prisma select shared anywhere system quota is evaluated. */
export const SYSTEM_QUOTA_USER_SELECT = {
  id: true,
  vaultKeyId: true,
  activeProvider: true,
  aiSourcePreference: true,
  systemAiEnabled: true,
  aiEnhancementsToday: true,
  aiCallsToday: true,
  aiQuotaResetAt: true,
  plan: true,
  subscriptionStatus: true,
} as const;

export async function getSystemQuotaGateForUser(
  userId: string,
  options: SystemQuotaGateOptions = {},
): Promise<SystemQuotaGateResult> {
  const [user, aiEngine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: SYSTEM_QUOTA_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
  ]);

  if (!user) {
    return systemQuotaGateNotApplicable();
  }

  return getSystemQuotaGateForUserRow(user, aiEngine, options);
}

export async function getSystemQuotaGateForUserRow(
  user: SystemQuotaUserRow,
  aiEngine: AiEngineConfig,
  options: SystemQuotaGateOptions = {},
): Promise<SystemQuotaGateResult> {
  const preference = (user.aiSourcePreference ?? "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    userId: user.id,
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: options.forceSystem ?? false,
    userSystemAiEnabled: user.systemAiEnabled,
    aiEngine,
  });

  if ("error" in route || route.mode !== "system") {
    return systemQuotaGateNotApplicable();
  }

  if (isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null)) {
    return systemQuotaGateNotApplicable();
  }

  const { quotaRow } = resolveQuotaRowWithReset(user);
  return evaluateCombinedSystemQuotaGate(quotaRow, aiEngine, options);
}
