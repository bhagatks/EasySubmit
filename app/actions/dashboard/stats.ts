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

export type DashboardVerificationMetrics = {
  parseIntegrity: number;
  keywordMatch: number;
  recruiterReadability: number;
};

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

  const [user, usageLogs, pricingMap, jobTrackerStats] = await Promise.all([
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
    },
  };
}
