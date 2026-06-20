"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SaveUsageLogInput = {
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
};

export type SaveUsageLogSuccess = {
  success: true;
  logId: string;
};

export type SaveUsageLogFailure = {
  success: false;
  error: string;
};

export type SaveUsageLogResult = SaveUsageLogSuccess | SaveUsageLogFailure;

/** Persist AI usage for dashboard spend metrics. */
export async function saveUsageLog(
  input: SaveUsageLogInput,
): Promise<SaveUsageLogResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const tokensUsed = Math.max(0, Math.floor(input.tokensUsed));
  const modelId = input.modelId.trim();
  if (!modelId) {
    return { success: false, error: "Model id is required" };
  }

  const estimatedCost = Math.max(0, input.estimatedCost);

  try {
    const log = await prisma.usageLog.create({
      data: {
        userId,
        tokensUsed,
        modelId,
        estimatedCost,
      },
      select: { id: true },
    });

    return { success: true, logId: log.id };
  } catch {
    return { success: false, error: "Failed to save usage log" };
  }
}

/** Internal helper — same as saveUsageLog but accepts userId for server-side chaining. */
export async function recordUsageLogForUser(
  userId: string,
  input: SaveUsageLogInput,
): Promise<SaveUsageLogResult> {
  const tokensUsed = Math.max(0, Math.floor(input.tokensUsed));
  const modelId = input.modelId.trim();
  if (!modelId) {
    return { success: false, error: "Model id is required" };
  }

  try {
    const log = await prisma.usageLog.create({
      data: {
        userId,
        tokensUsed,
        modelId,
        estimatedCost: Math.max(0, input.estimatedCost),
      },
      select: { id: true },
    });

    return { success: true, logId: log.id };
  } catch {
    return { success: false, error: "Failed to save usage log" };
  }
}

export type UsageSpendSummary = {
  totalTokens: number;
  totalSpendUsd: number;
  callCount: number;
};

export async function getUsageSpendSummary(): Promise<UsageSpendSummary | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const aggregate = await prisma.usageLog.aggregate({
    where: { userId },
    _sum: {
      tokensUsed: true,
      estimatedCost: true,
    },
    _count: { id: true },
  });

  return {
    totalTokens: aggregate._sum.tokensUsed ?? 0,
    totalSpendUsd: Number(aggregate._sum.estimatedCost ?? 0),
    callCount: aggregate._count.id,
  };
}
