import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";
import { parseAiEngineConfig } from "@/src/lib/services/ai-engine-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemApiKey: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import {
  executeWithPoolRetry,
  markSystemKeyRateLimited,
  resetSystemKeyPoolForTests,
} from "@/src/lib/ai/engine/system-key-pool";
import {
  buildQuotaSnapshot,
  checkAiQuota,
  incrementQuotaPatch,
  quotaResetPatchIfNeeded,
} from "@/src/lib/ai/engine/quota";

describe.sequential("system-key-pool", () => {
  const original = process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS;

  beforeEach(() => {
    resetSystemKeyPoolForTests();
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS = "k1,k2,k3";
  });

  afterEach(() => {
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS = original;
    resetSystemKeyPoolForTests();
  });

  it("spreads env keys by least-calls when vault is empty", async () => {
    const first = await executeWithPoolRetry(async ({ apiKey }) => apiKey);
    const second = await executeWithPoolRetry(async ({ apiKey }) => apiKey);
    expect(first.result).not.toBe(second.result);
    expect(first.keySource).toBe("env");
  });

  it("skips cooling keys", async () => {
    markSystemKeyRateLimited(0, 60_000);
    markSystemKeyRateLimited(1, 60_000);
    const result = await executeWithPoolRetry(async ({ slot }) => slot);
    expect(result.slot).toBe(2);
  });
});

describe("quota", () => {
  const row = {
    aiEnhancementsToday: 0,
    aiCallsToday: 0,
    aiQuotaResetAt: new Date(),
  };

  const limitedCustomerConfig = parseAiEngineConfig({
    quotas: {
      customer: { aiDailyUnlimited: false, dailyEnhancements: 50, dailyCalls: 200 },
    },
    customerDailyEnhancementCap: 50,
  })!;

  it("resets counters on new UTC day", () => {
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const patch = quotaResetPatchIfNeeded(
      { aiEnhancementsToday: 3, aiCallsToday: 10, aiQuotaResetAt: yesterday },
      new Date(),
    );
    expect(patch?.aiEnhancementsToday).toBe(0);
    expect(patch?.aiCallsToday).toBe(0);
  });

  it("blocks system enhancement limit from app config defaults", () => {
    const atLimit = {
      ...row,
      aiEnhancementsToday: AI_ENGINE_DEFAULTS.quotas.system.dailyEnhancements,
    };
    const result = checkAiQuota(atLimit, AI_ENGINE_DEFAULTS, "system", {
      isEnhancement: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("enhancement_limit");
    }
  });

  it("allows unlimited customer when app config aiDailyUnlimited is true", () => {
    const heavy = {
      aiEnhancementsToday: 999,
      aiCallsToday: 999,
      aiQuotaResetAt: new Date(),
    };
    const result = checkAiQuota(heavy, AI_ENGINE_DEFAULTS, "customer", {
      isEnhancement: true,
      estimatedCalls: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("caps customer enhancements when app config aiDailyUnlimited is false", () => {
    const atCap = {
      ...row,
      aiEnhancementsToday: limitedCustomerConfig.customerDailyEnhancementCap,
    };
    const result = checkAiQuota(atCap, limitedCustomerConfig, "customer", {
      isEnhancement: true,
    });
    expect(result.ok).toBe(false);
  });

  it("builds snapshot with unlimited flag from app config", () => {
    const snapshot = buildQuotaSnapshot(row, AI_ENGINE_DEFAULTS, "customer");
    expect(snapshot.unlimited).toBe(true);
  });

  it("increments call count for multi-pass jobs", () => {
    const next = incrementQuotaPatch(
      { aiEnhancementsToday: 1, aiCallsToday: 4, aiQuotaResetAt: new Date() },
      AI_ENGINE_DEFAULTS,
      { isEnhancement: true, callCount: 2, mode: "system" },
    );
    expect(next.aiEnhancementsToday).toBe(2);
    expect(next.aiCallsToday).toBe(6);
  });

  it("skips increment for unlimited customer from app config", () => {
    const next = incrementQuotaPatch(
      {
        aiEnhancementsToday: 1,
        aiCallsToday: 4,
        aiQuotaResetAt: new Date(),
      },
      AI_ENGINE_DEFAULTS,
      { isEnhancement: true, callCount: 2, mode: "customer" },
    );
    expect(next.aiEnhancementsToday).toBe(1);
    expect(next.aiCallsToday).toBe(4);
  });
});
