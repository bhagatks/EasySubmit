import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import {
  AI_ENGINE_DEFAULTS,
  isCustomerQuotaUnlimited,
  resolveCustomerEnhancementLimit,
} from "@/src/lib/services/ai-engine-config";

export type UserQuotaRow = {
  aiEnhancementsToday: number;
  aiCallsToday: number;
  aiQuotaResetAt: Date;
};

export type QuotaSnapshot = {
  enhancementsUsed: number;
  enhancementsLimit: number;
  callsUsed: number;
  callsLimit: number;
  resetsAt: Date;
  unlimited?: boolean;
};

export type AiQuotaMode = "system" | "customer";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcMidnight(from: Date): Date {
  const start = startOfUtcDay(from);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** Returns DB update payload when UTC day rolled over. */
export function quotaResetPatchIfNeeded(row: UserQuotaRow, now = new Date()): {
  aiEnhancementsToday: number;
  aiCallsToday: number;
  aiQuotaResetAt: Date;
} | null {
  const dayStart = startOfUtcDay(now);
  const resetAt = startOfUtcDay(row.aiQuotaResetAt);
  if (resetAt.getTime() >= dayStart.getTime()) return null;
  return {
    aiEnhancementsToday: 0,
    aiCallsToday: 0,
    aiQuotaResetAt: now,
  };
}

function limitsForMode(config: AiEngineConfig, mode: AiQuotaMode) {
  if (mode === "customer" && isCustomerQuotaUnlimited(config)) {
    return {
      enhancementsLimit: Number.MAX_SAFE_INTEGER,
      callsLimit: Number.MAX_SAFE_INTEGER,
      unlimited: true,
    };
  }

  if (mode === "customer") {
    return {
      enhancementsLimit: resolveCustomerEnhancementLimit(config) ?? config.customerDailyEnhancementCap,
      callsLimit: config.quotas.customer.dailyCalls,
      unlimited: false,
    };
  }

  return {
    enhancementsLimit: config.quotas.system.dailyEnhancements,
    callsLimit: config.quotas.system.dailyCalls,
    unlimited: false,
  };
}

export function buildQuotaSnapshot(
  row: UserQuotaRow,
  config: AiEngineConfig,
  mode: AiQuotaMode,
): QuotaSnapshot {
  const limits = limitsForMode(config, mode);
  return {
    enhancementsUsed: row.aiEnhancementsToday,
    enhancementsLimit: limits.enhancementsLimit,
    callsUsed: row.aiCallsToday,
    callsLimit: limits.callsLimit,
    resetsAt: nextUtcMidnight(new Date()),
    ...(limits.unlimited ? { unlimited: true } : {}),
  };
}

export type QuotaCheckResult =
  | { ok: true }
  | { ok: false; reason: "enhancement_limit" | "call_limit"; snapshot: QuotaSnapshot };

export function checkAiQuota(
  row: UserQuotaRow,
  config: AiEngineConfig,
  mode: AiQuotaMode,
  options: { isEnhancement?: boolean; estimatedCalls?: number } = {},
): QuotaCheckResult {
  const snapshot = buildQuotaSnapshot(row, config, mode);

  if (mode === "customer" && isCustomerQuotaUnlimited(config)) {
    return { ok: true };
  }

  const estimatedCalls = options.estimatedCalls ?? 1;
  if (row.aiCallsToday + estimatedCalls > snapshot.callsLimit) {
    return { ok: false, reason: "call_limit", snapshot };
  }

  if (options.isEnhancement && row.aiEnhancementsToday >= snapshot.enhancementsLimit) {
    return { ok: false, reason: "enhancement_limit", snapshot };
  }

  return { ok: true };
}

export function incrementQuotaPatch(
  row: UserQuotaRow,
  config: AiEngineConfig,
  options: { isEnhancement?: boolean; callCount?: number; mode?: AiQuotaMode } = {},
): { aiEnhancementsToday: number; aiCallsToday: number } {
  if (options.mode === "customer" && isCustomerQuotaUnlimited(config)) {
    return {
      aiEnhancementsToday: row.aiEnhancementsToday,
      aiCallsToday: row.aiCallsToday,
    };
  }

  const calls = Math.max(1, options.callCount ?? 1);
  return {
    aiEnhancementsToday: options.isEnhancement
      ? row.aiEnhancementsToday + 1
      : row.aiEnhancementsToday,
    aiCallsToday: row.aiCallsToday + calls,
  };
}

export function shouldTrackQuota(config: AiEngineConfig, mode: AiQuotaMode): boolean {
  if (mode === "system") return true;
  return !isCustomerQuotaUnlimited(config);
}
