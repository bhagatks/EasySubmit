import { prisma } from "@/lib/prisma";
import { getTodayPacificDateString } from "@/src/lib/ai/engine/pacific-time";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";

export type SystemAiDailyUsageRow = {
  date: string;
  openRouterCalls: number;
  systemEnhancements: number;
  deepSeekPaidCalls: number;
};

export type GlobalSystemQuotaBlockReason =
  | "global_call_limit"
  | "global_enhancement_limit";

export type GlobalSystemQuotaCheckResult =
  | { ok: true; usage: SystemAiDailyUsageRow }
  | {
      ok: false;
      reason: GlobalSystemQuotaBlockReason;
      message: string;
      usage: SystemAiDailyUsageRow;
    };

export type GlobalSystemQuotaCheckOptions = {
  isEnhancement?: boolean;
  /** OpenRouter free calls expected for this action (defaults to 1). */
  estimatedOpenRouterCalls?: number;
  traceId?: string;
};

async function loadOrCreateUsage(date = getTodayPacificDateString()): Promise<SystemAiDailyUsageRow> {
  const row = await prisma.systemAiDailyUsage.upsert({
    where: { date },
    create: { date },
    update: {},
  });
  return {
    date: row.date,
    openRouterCalls: row.openRouterCalls,
    systemEnhancements: row.systemEnhancements,
    deepSeekPaidCalls: row.deepSeekPaidCalls,
  };
}

export async function getSystemAiDailyUsage(
  date = getTodayPacificDateString(),
): Promise<SystemAiDailyUsageRow> {
  const row = await prisma.systemAiDailyUsage.findUnique({ where: { date } });
  if (!row) {
    return {
      date,
      openRouterCalls: 0,
      systemEnhancements: 0,
      deepSeekPaidCalls: 0,
    };
  }
  return {
    date: row.date,
    openRouterCalls: row.openRouterCalls,
    systemEnhancements: row.systemEnhancements,
    deepSeekPaidCalls: row.deepSeekPaidCalls,
  };
}

export async function checkGlobalSystemQuota(
  config: AiEngineConfig,
  options: GlobalSystemQuotaCheckOptions = {},
): Promise<GlobalSystemQuotaCheckResult> {
  const usage = await loadOrCreateUsage();
  const estimatedOpenRouterCalls = Math.max(1, options.estimatedOpenRouterCalls ?? 1);
  const { dailyTotalSystemCalls, dailyTotalSystemEnhancements } = config.quotas.system;

  logEnhance("quota", "global.check.start", {
    traceId: options.traceId,
    date: usage.date,
    openRouterCalls: usage.openRouterCalls,
    systemEnhancements: usage.systemEnhancements,
    estimatedOpenRouterCalls,
    isEnhancement: options.isEnhancement ?? false,
  });

  if (
    options.isEnhancement &&
    usage.systemEnhancements >= dailyTotalSystemEnhancements
  ) {
    const message = `EasySubmit system AI enhancement capacity is exhausted for today (${dailyTotalSystemEnhancements}/day). Try again tomorrow or add your own API key.`;
    logEnhance("quota", "global.check.fail", {
      traceId: options.traceId,
      reason: "global_enhancement_limit",
      usage,
      limit: dailyTotalSystemEnhancements,
    });
    return { ok: false, reason: "global_enhancement_limit", message, usage };
  }

  if (usage.openRouterCalls + estimatedOpenRouterCalls > dailyTotalSystemCalls) {
    const message = `EasySubmit OpenRouter free capacity is exhausted for today (${dailyTotalSystemCalls}/day). Paid overflow may still run when configured.`;
    logEnhance("quota", "global.check.fail", {
      traceId: options.traceId,
      reason: "global_call_limit",
      usage,
      limit: dailyTotalSystemCalls,
    });
    return { ok: false, reason: "global_call_limit", message, usage };
  }

  logEnhance("quota", "global.check.done", {
    traceId: options.traceId,
    usage,
  });
  return { ok: true, usage };
}

export async function incrementGlobalOpenRouterCall(options: { traceId?: string } = {}): Promise<void> {
  const date = getTodayPacificDateString();
  logEnhance("quota", "global.openrouter.increment.start", { traceId: options.traceId, date });
  await prisma.systemAiDailyUsage.upsert({
    where: { date },
    create: { date, openRouterCalls: 1 },
    update: { openRouterCalls: { increment: 1 } },
  });
  logEnhance("quota", "global.openrouter.increment.done", { traceId: options.traceId, date });
}

export async function incrementGlobalDeepSeekPaidCall(options: { traceId?: string } = {}): Promise<void> {
  const date = getTodayPacificDateString();
  logEnhance("quota", "global.deepseek.increment.start", { traceId: options.traceId, date });
  await prisma.systemAiDailyUsage.upsert({
    where: { date },
    create: { date, deepSeekPaidCalls: 1 },
    update: { deepSeekPaidCalls: { increment: 1 } },
  });
  logEnhance("quota", "global.deepseek.increment.done", { traceId: options.traceId, date });
}

export async function incrementGlobalSystemEnhancement(options: { traceId?: string } = {}): Promise<void> {
  const date = getTodayPacificDateString();
  logEnhance("quota", "global.enhancement.increment.start", { traceId: options.traceId, date });
  await prisma.systemAiDailyUsage.upsert({
    where: { date },
    create: { date, systemEnhancements: 1 },
    update: { systemEnhancements: { increment: 1 } },
  });
  logEnhance("quota", "global.enhancement.increment.done", { traceId: options.traceId, date });
}

export function resetGlobalSystemQuotaForTests(): void {
  // Prisma is mocked in unit tests — callers reset mocks directly.
}
