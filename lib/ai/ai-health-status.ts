"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";

export type AiHealthErrorCode =
  | "quota_exhausted" // system quota used up for the day, no BYOK key
  | "key_invalid" // BYOK key present but returning auth/quota errors
  | "api_error"; // recent generic AI call failures

export type AiHealthStatus =
  | { ok: true }
  | { ok: false; code: AiHealthErrorCode; message: string };

const KEY_ERROR_CODES = [
  "invalid_api_key",
  "authentication_failed",
  "insufficient_quota",
  "permission_denied",
  "api_key_invalid",
];

async function _checkForUser(userId: string): Promise<AiHealthStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vaultKeyId: true,
      aiSourcePreference: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
    },
  });
  if (!user) return { ok: true };

  const aiEngine = await getAppConfig("aiEngine");
  const { dailyEnhancements, dailyCalls } = aiEngine.quotas.system;

  const usesSystemAi =
    user.aiSourcePreference === "system" ||
    (user.aiSourcePreference === "auto" && !user.vaultKeyId);

  // 1. System quota exhausted
  if (
    usesSystemAi &&
    !user.vaultKeyId &&
    (user.aiEnhancementsToday >= dailyEnhancements || user.aiCallsToday >= dailyCalls)
  ) {
    return {
      ok: false,
      code: "quota_exhausted",
      message: "Daily AI quota used up. Add your own API key for unlimited use.",
    };
  }

  // 2. BYOK key returning auth/quota errors (check last 60 min, require >= 2 failures)
  if (user.vaultKeyId) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentKeyFailures = await prisma.apiCallLog.count({
      where: {
        userId,
        keySource: "customer",
        status: "error",
        errorCode: { in: KEY_ERROR_CODES },
        createdAt: { gte: since },
      },
    });
    if (recentKeyFailures >= 2) {
      return {
        ok: false,
        code: "key_invalid",
        message: "Your API key is failing. Check it in AI Keys settings.",
      };
    }
  }

  // 3. Generic AI failures — last 30 min with no successes
  const since30 = new Date(Date.now() - 30 * 60 * 1000);
  const [recentErrors, recentSuccesses] = await Promise.all([
    prisma.apiCallLog.count({
      where: { userId, status: "error", createdAt: { gte: since30 } },
    }),
    prisma.apiCallLog.count({
      where: { userId, status: "success", createdAt: { gte: since30 } },
    }),
  ]);
  if (recentErrors >= 3 && recentSuccesses === 0) {
    return {
      ok: false,
      code: "api_error",
      message: "AI calls are failing. Check your settings.",
    };
  }

  return { ok: true };
}

/** For use in API routes where userId is already resolved from the bearer token. */
export async function getAiHealthStatusForUser(userId: string): Promise<AiHealthStatus> {
  return _checkForUser(userId);
}

/** For use in server actions / RSC where the session is available. */
export async function getAiHealthStatus(): Promise<AiHealthStatus> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: true };
  return _checkForUser(userId);
}
