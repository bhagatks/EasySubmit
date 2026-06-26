import { prisma } from "@/lib/prisma";
import { getByokKeyGateForUserRow } from "@/lib/ai/byok-key-gate-for-user";
import { getSystemQuotaGateForUserRow, SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import { byokKeyGateNotApplicable } from "@/src/lib/ai/engine/byok-key-gate";
import type { ByokKeyGateResult } from "@/src/lib/ai/engine/byok-key-gate";
import type { SystemQuotaGateResult } from "@/src/lib/ai/engine/system-quota-gate";
import { SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS } from "@/src/lib/ai/engine/system-quota-gate";

export type AiReadinessErrorCode = "quota_exhausted" | "key_invalid" | "key_missing";

export type AiReadinessStatus =
  | { ok: true }
  | { ok: false; code: AiReadinessErrorCode; message: string };

export type AiReadinessCheckResult = {
  status: AiReadinessStatus;
  systemQuota: SystemQuotaGateResult;
  byokKey: ByokKeyGateResult;
  reason: string;
};

export type AiReadinessOptions = {
  forceSystem?: boolean;
  estimatedCalls?: number;
};

function blocked(
  reason: string,
  code: AiReadinessErrorCode,
  message: string,
  systemQuota: SystemQuotaGateResult,
  byokKey: ByokKeyGateResult,
): AiReadinessCheckResult {
  return {
    status: { ok: false, code, message },
    systemQuota,
    byokKey,
    reason,
  };
}

function healthy(
  systemQuota: SystemQuotaGateResult,
  byokKey: ByokKeyGateResult,
): AiReadinessCheckResult {
  return {
    status: { ok: true },
    systemQuota,
    byokKey,
    reason: "healthy",
  };
}

/** Single launch-time gate: BYOK validity (Auto/My key) then system daily quota. */
export async function getAiReadinessForUser(
  userId: string,
  options: AiReadinessOptions = {},
): Promise<AiReadinessCheckResult> {
  const estimatedCalls = options.estimatedCalls ?? SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SYSTEM_QUOTA_USER_SELECT,
  });

  if (!user) {
    const systemQuota = {
      applies: false,
      exceeded: false,
      reason: null,
      message: null,
      code: null,
      snapshot: null,
    };
    const byokKey = {
      applies: false,
      valid: true,
      reason: null,
      message: null,
      code: null,
      lastJobFailure: null,
    };
    return healthy(systemQuota, byokKey);
  }

  const { getAppConfig } = await import("@/src/lib/services/config-service");
  const aiEngine = await getAppConfig("aiEngine");
  const forceSystem = options.forceSystem ?? false;

  const systemQuota = await getSystemQuotaGateForUserRow(user, aiEngine, {
    forceSystem,
    isEnhancement: true,
    estimatedCalls,
  });

  const byokKey = forceSystem
    ? byokKeyGateNotApplicable()
    : await getByokKeyGateForUserRow(userId, user, aiEngine, { forceSystem });

  if (byokKey.applies && !byokKey.valid && byokKey.message && byokKey.code) {
    return blocked(
      byokKey.reason ?? "byok_invalid",
      byokKey.code,
      byokKey.message,
      systemQuota,
      byokKey,
    );
  }

  if (systemQuota.applies && systemQuota.exceeded && systemQuota.message) {
    return blocked(
      systemQuota.reason ?? "quota_exhausted",
      "quota_exhausted",
      systemQuota.message,
      systemQuota,
      byokKey,
    );
  }

  return healthy(systemQuota, byokKey);
}

export async function getAiReadinessStatusForUser(
  userId: string,
  options?: AiReadinessOptions,
): Promise<AiReadinessStatus> {
  const result = await getAiReadinessForUser(userId, options);
  return result.status;
}
