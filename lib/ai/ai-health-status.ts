import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import { logAiHealth, redactUserId } from "@/lib/ai/ai-health-debug";

export type AiHealthErrorCode =
  | "quota_exhausted"
  | "key_invalid"
  | "key_missing"
  | "api_error";

export type AiHealthStatus =
  | { ok: true }
  | { ok: false; code: AiHealthErrorCode; message: string };

export type AiHealthDebugSnapshot = {
  reason: string;
  hasVaultKey: boolean;
  aiSourcePreference: string | null;
  routeMode: string | null;
  byokApplies: boolean;
  byokValid: boolean;
  byokReason: string | null;
  lastJobKeyFailure: string | null;
  quotaExceeded: boolean;
  quotaBlockReason: string | null;
  recentQuotaErrors60m: number;
  recentKeyErrors30m: number;
  recentErrors30m: number;
  recentSuccesses30m: number;
};

export type AiHealthCheckResult = {
  status: AiHealthStatus;
  debug: AiHealthDebugSnapshot;
};

const QUOTA_ERROR_CODES = ["insufficient_quota", "capacity_exhausted"] as const;

const KEY_ERROR_CODES = [
  "vault_decrypt_failed",
  "insufficient_quota",
  "provider_error",
  "invalid_api_key",
  "authentication_failed",
  "permission_denied",
  "api_key_invalid",
  "rate_limited",
  "capacity_exhausted",
];

function finishCheck(
  userId: string,
  debug: AiHealthDebugSnapshot,
  status: AiHealthStatus,
): AiHealthCheckResult {
  logAiHealth("check.result", {
    userId: redactUserId(userId),
    reason: debug.reason,
    ok: status.ok,
    code: status.ok ? null : status.code,
    message: status.ok ? null : status.message,
  });
  return { status, debug };
}

async function _checkForUser(userId: string): Promise<AiHealthCheckResult> {
  const baseDebug = (): AiHealthDebugSnapshot => ({
    reason: "pending",
    hasVaultKey: false,
    aiSourcePreference: null,
    routeMode: null,
    byokApplies: false,
    byokValid: true,
    byokReason: null,
    lastJobKeyFailure: null,
    quotaExceeded: false,
    quotaBlockReason: null,
    recentQuotaErrors60m: 0,
    recentKeyErrors30m: 0,
    recentErrors30m: 0,
    recentSuccesses30m: 0,
  });

  logAiHealth("check.start", { userId: redactUserId(userId) });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vaultKeyId: true,
      aiSourcePreference: true,
      activeProvider: true,
    },
  });

  if (!user) {
    const debug = { ...baseDebug(), reason: "user_not_found" };
    return finishCheck(userId, debug, { ok: true });
  }

  const debug = baseDebug();
  debug.hasVaultKey = Boolean(user.vaultKeyId);
  debug.aiSourcePreference = user.aiSourcePreference;

  const readiness = await getAiReadinessForUser(userId);
  debug.byokApplies = readiness.byokKey.applies;
  debug.byokValid = readiness.byokKey.valid;
  debug.byokReason = readiness.byokKey.reason;
  debug.quotaExceeded = readiness.systemQuota.applies && readiness.systemQuota.exceeded;
  debug.quotaBlockReason = readiness.systemQuota.reason;
  debug.lastJobKeyFailure = readiness.byokKey.lastJobFailure?.title ?? null;

  if (readiness.systemQuota.applies) {
    debug.routeMode = "system";
  } else if (readiness.byokKey.applies) {
    debug.routeMode = "customer";
  }

  logAiHealth("check.readiness", {
    userId: redactUserId(userId),
    reason: readiness.reason,
    ok: readiness.status.ok,
    byokApplies: debug.byokApplies,
    byokValid: debug.byokValid,
    quotaExceeded: debug.quotaExceeded,
  });

  if (!readiness.status.ok) {
    debug.reason = readiness.reason;
    return finishCheck(userId, debug, readiness.status);
  }

  const since60 = new Date(Date.now() - 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 60 * 1000);

  const recentQuotaErrors = await prisma.apiCallLog.count({
    where: {
      userId,
      status: "error",
      errorCode: { in: [...QUOTA_ERROR_CODES] },
      createdAt: { gte: since60 },
    },
  });
  debug.recentQuotaErrors60m = recentQuotaErrors;

  if (recentQuotaErrors >= 1 && debug.routeMode === "system") {
    debug.reason = "recent_quota_api_errors";
    return finishCheck(userId, debug, {
      ok: false,
      code: "quota_exhausted",
      message:
        "EasySubmit's shared AI hit quota limits. Add your own API key for unlimited use.",
    });
  }

  const [recentKeyErrors, recentErrors, recentSuccesses] = await Promise.all([
    prisma.apiCallLog.count({
      where: {
        userId,
        status: "error",
        errorCode: { in: KEY_ERROR_CODES },
        createdAt: { gte: since30 },
      },
    }),
    prisma.apiCallLog.count({
      where: { userId, status: "error", createdAt: { gte: since30 } },
    }),
    prisma.apiCallLog.count({
      where: { userId, status: "success", createdAt: { gte: since30 } },
    }),
  ]);

  debug.recentKeyErrors30m = recentKeyErrors;
  debug.recentErrors30m = recentErrors;
  debug.recentSuccesses30m = recentSuccesses;

  if (recentKeyErrors >= 1 && recentSuccesses === 0 && debug.routeMode === "customer") {
    debug.reason = "key_errors_no_success";
    return finishCheck(userId, debug, {
      ok: false,
      code: "key_invalid",
      message: "Your API key is failing. Check it in AI Keys settings.",
    });
  }

  if (recentErrors >= 2 && recentSuccesses === 0) {
    debug.reason = "generic_errors_no_success";
    return finishCheck(userId, debug, {
      ok: false,
      code: "api_error",
      message: "AI calls are failing. Check your settings.",
    });
  }

  debug.reason = "healthy";
  return finishCheck(userId, debug, { ok: true });
}

export async function getAiHealthCheckForUser(userId: string): Promise<AiHealthCheckResult> {
  return _checkForUser(userId);
}

export async function getAiHealthStatusForUser(userId: string): Promise<AiHealthStatus> {
  const result = await _checkForUser(userId);
  return result.status;
}

export async function getAiHealthStatus(): Promise<AiHealthStatus> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: true };
  return getAiHealthStatusForUser(userId);
}
