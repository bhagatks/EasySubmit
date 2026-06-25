import { prisma } from "@/lib/prisma";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  evaluateSystemQuotaGate,
  resolveQuotaRowWithReset,
  systemQuotaGateNotApplicable,
  type SystemQuotaGateOptions,
  type SystemQuotaGateResult,
  type SystemQuotaUserRow,
} from "@/src/lib/ai/engine/system-quota-gate";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { getAppConfig } from "@/src/lib/services/config-service";

/** Prisma select shared anywhere system quota is evaluated. */
export const SYSTEM_QUOTA_USER_SELECT = {
  vaultKeyId: true,
  activeProvider: true,
  aiSourcePreference: true,
  aiEnhancementsToday: true,
  aiCallsToday: true,
  aiQuotaResetAt: true,
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
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: options.forceSystem ?? false,
    aiEngine,
  });

  if ("error" in route || route.mode !== "system") {
    return systemQuotaGateNotApplicable();
  }

  const { quotaRow } = resolveQuotaRowWithReset(user);
  return evaluateSystemQuotaGate(quotaRow, aiEngine, options);
}
