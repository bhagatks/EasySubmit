"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobTrackerStatsForUser } from "@/app/actions/job-tracker";
import {
  averageCalibrationScores,
  parseArchitectureMetadata,
} from "@/lib/dashboard/architecture-metadata";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import { estimateUsageCostFromTotalTokens } from "@/src/lib/ai/estimate-usage-cost";
import { getAppConfig } from "@/src/lib/services/config-service";
import {
  FREE_SLOT_DAILY_CALL_CAP,
  PLATFORM_DAILY_CALL_CAP,
} from "@/src/lib/ai/engine/pool-constants";

export type DashboardVerificationMetrics = {
  parseIntegrity: number;
  keywordMatch: number;
  recruiterReadability: number;
};

export type SystemQuotaStats = {
  callsToday: number;
  dailyCap: number;
  slotCap: number;
  slotsTotal: number;
  slotsExhausted: number;
};

export type NextBestAction =
  | { type: "ready_to_apply"; count: number }
  | { type: "tailoring"; count: number }
  | { type: "add_key"; count: number }
  | { type: "save_first_job" }
  | { type: "all_good"; appliedCount: number };

export type DashboardStats = {
  vaultKeyId: string | null;
  activeProvider: string | null;
  resumesGenerated: number;
  jobsTracked: number;
  avgAtsScore: number | null;
  aiCallCount: number;
  aiSpendUsd: number;
  verification: DashboardVerificationMetrics;
  recentJobTrackerEntries: JobTrackerSummary[];
  targetRole: string | null;
  architectureUpdatedAt: string | null;
  systemQuota: SystemQuotaStats | null;
  nextBestAction: NextBestAction;
};

export type DashboardStatsResult =
  | { success: true; stats: DashboardStats }
  | { success: false; error: string };


export async function getDashboardStats(): Promise<DashboardStatsResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const [user, usageLogs, pricingMap, jobTrackerStats, systemKeySlots, statusGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        vaultKeyId: true,
        activeProvider: true,
        profiles: {
          where: { isDefault: true },
          take: 1,
          select: {
            targetTitle: true,
            calibrationScore: true,
            content: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.usageLog.findMany({
      where: { userId },
      select: {
        modelId: true,
        tokensUsed: true,
      },
    }),
    getAppConfig("ai_pricing_map"),
    getJobTrackerStatsForUser(userId),
    prisma.systemApiKey.findMany({
      where: { enabled: true, provider: "gemini" },
      select: { callsToday: true, exhaustedUntil: true },
    }),
    prisma.jobTrackerEntry.groupBy({
      by: ["status"],
      where: { userId, status: { not: "ARCHIVED" } },
      _count: { _all: true },
    }),
  ]);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const profile = user.profiles[0];
  const metadata = parseArchitectureMetadata(profile?.content);

  const resumesGenerated =
    metadata.resumesGenerated ?? (profile ? 1 : 0);

  const avgAtsScore = averageCalibrationScores(
    profile?.calibrationScore,
    metadata,
  );

  const verification: DashboardVerificationMetrics = {
    parseIntegrity: metadata.parseIntegrity ?? 0,
    keywordMatch: metadata.keywordMatch ?? 0,
    recruiterReadability: metadata.recruiterReadability ?? 0,
  };

  const aiCallCount = usageLogs.length;
  const aiSpendUsd = usageLogs.reduce(
    (sum, log) =>
      sum +
      estimateUsageCostFromTotalTokens(log.modelId, log.tokensUsed, pricingMap),
    0,
  );

  const now = new Date();
  const systemQuota: SystemQuotaStats | null = systemKeySlots.length > 0
    ? {
        callsToday: systemKeySlots.reduce((sum, s) => sum + s.callsToday, 0),
        dailyCap: PLATFORM_DAILY_CALL_CAP,
        slotCap: FREE_SLOT_DAILY_CALL_CAP,
        slotsTotal: systemKeySlots.length,
        slotsExhausted: systemKeySlots.filter(
          (s) => s.exhaustedUntil && s.exhaustedUntil > now,
        ).length,
      }
    : null;

  const statusMap = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all]),
  ) as Record<string, number>;
  const readyCount = statusMap["READY_TO_APPLY"] ?? 0;
  const tailoringCount = (statusMap["CAPTURED"] ?? 0) + (statusMap["RESUME_READY"] ?? 0);
  const appliedCount = statusMap["APPLIED"] ?? 0;
  const totalActive = jobTrackerStats.jobsTracked;

  let nextBestAction: NextBestAction;
  if (totalActive === 0) {
    nextBestAction = { type: "save_first_job" };
  } else if (readyCount > 0) {
    nextBestAction = { type: "ready_to_apply", count: readyCount };
  } else if (!user.vaultKeyId && tailoringCount > 0) {
    nextBestAction = { type: "add_key", count: tailoringCount };
  } else if (tailoringCount > 0) {
    nextBestAction = { type: "tailoring", count: tailoringCount };
  } else {
    nextBestAction = { type: "all_good", appliedCount };
  }

  return {
    success: true,
    stats: {
      vaultKeyId: user.vaultKeyId,
      activeProvider: user.activeProvider,
      resumesGenerated,
      jobsTracked: jobTrackerStats.jobsTracked,
      avgAtsScore,
      aiCallCount,
      aiSpendUsd,
      verification,
      recentJobTrackerEntries: jobTrackerStats.recentEntries,
      targetRole: profile?.targetTitle ?? null,
      architectureUpdatedAt: profile?.updatedAt.toISOString() ?? null,
      systemQuota,
      nextBestAction,
    },
  };
}
