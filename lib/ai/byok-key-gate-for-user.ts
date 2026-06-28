import { prisma } from "@/lib/prisma";
import { unvaultUserApiKey } from "@/lib/vault/user-key-vault";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import { getActiveVaultKeyUpdatedAt } from "@/lib/vault/user-key-vault";
import {
  byokKeyGateApplies,
  byokKeyGateNotApplicable,
  evaluateByokKeyGate,
  ignoreStaleKeyFailure,
  isKeyRelatedPipelineError,
  parsePipelineMetadataError,
  type ByokKeyGateResult,
  type LastJobKeyFailure,
  BYOK_API_LOG_ERROR_CODES,
} from "@/src/lib/ai/engine/byok-key-gate";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { isHandshakeProvider } from "@/src/lib/config/career-grade-models";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { getAppConfig } from "@/src/lib/services/config-service";

export const BYOK_GATE_USER_SELECT = {
  vaultKeyId: true,
  activeProvider: true,
  aiSourcePreference: true,
} as const;

export type ByokGateUserRow = {
  vaultKeyId: string | null;
  activeProvider: string | null;
  aiSourcePreference: string | null;
};

export async function findLastKeyRelatedJobFailure(
  userId: string,
): Promise<LastJobKeyFailure | null> {
  const rows = await prisma.jobTrackerEntry.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      company: true,
      metadata: true,
      updatedAt: true,
    },
  });

  for (const row of rows) {
    const pipeline = parsePipelineMetadataError(row.metadata);
    if (!pipeline) continue;
    if (!isKeyRelatedPipelineError(pipeline.error, pipeline.code)) continue;
    return {
      entryId: row.id,
      title: row.title,
      company: row.company,
      error: pipeline.error,
      code: pipeline.code,
      failedAt: row.updatedAt,
    };
  }

  return null;
}

async function loadByokGateSignals(
  userId: string,
  user: ByokGateUserRow,
  aiEngine: AiEngineConfig,
  options?: { forceSystem?: boolean },
): Promise<Parameters<typeof evaluateByokKeyGate>[0]> {
  const preference = (user.aiSourcePreference ?? "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: options?.forceSystem ?? false,
    aiEngine,
  });

  let unvaultOk: boolean | null = null;
  if (
    !("error" in route) &&
    route.mode === "customer" &&
    user.activeProvider &&
    isHandshakeProvider(user.activeProvider)
  ) {
    const key = await unvaultUserApiKey(userId, user.activeProvider);
    unvaultOk = Boolean(key);
  }

  const since60 = new Date(Date.now() - 60 * 60 * 1000);
  const keyUpdatedAt = await getActiveVaultKeyUpdatedAt(userId, user);
  const failureSince =
    keyUpdatedAt && keyUpdatedAt > since60 ? keyUpdatedAt : since60;

  const recentApiFailures60m = byokKeyGateApplies(preference, user.vaultKeyId)
    ? await prisma.apiCallLog.count({
        where: {
          userId,
          aiMode: "customer",
          status: "error",
          errorCode: { in: [...BYOK_API_LOG_ERROR_CODES] },
          createdAt: { gte: failureSince },
        },
      })
    : 0;

  const recentApiSuccesses60m = byokKeyGateApplies(preference, user.vaultKeyId)
    ? await prisma.apiCallLog.count({
        where: {
          userId,
          aiMode: "customer",
          status: "success",
          createdAt: { gte: failureSince },
        },
      })
    : 0;

  const lastJobFailureRaw = byokKeyGateApplies(preference, user.vaultKeyId)
    ? await findLastKeyRelatedJobFailure(userId)
    : null;
  const lastJobFailure = ignoreStaleKeyFailure(lastJobFailureRaw, keyUpdatedAt);

  return {
    preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    route,
    unvaultOk,
    recentApiFailures60m,
    recentApiSuccesses60m,
    lastJobFailure,
  };
}

export async function getByokKeyGateForUser(
  userId: string,
  options?: { forceSystem?: boolean },
): Promise<ByokKeyGateResult> {
  const [user, aiEngine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: BYOK_GATE_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
  ]);

  if (!user) {
    return byokKeyGateNotApplicable();
  }

  const signals = await loadByokGateSignals(userId, user, aiEngine, options);
  return evaluateByokKeyGate(signals);
}

export async function getByokKeyGateForUserRow(
  userId: string,
  user: ByokGateUserRow,
  aiEngine: AiEngineConfig,
  options?: { forceSystem?: boolean },
): Promise<ByokKeyGateResult> {
  const signals = await loadByokGateSignals(userId, user, aiEngine, options);
  return evaluateByokKeyGate(signals);
}
