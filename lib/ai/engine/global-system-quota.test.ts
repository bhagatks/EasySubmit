import { describe, expect, it, beforeEach, vi } from "vitest";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";

const { upsertMock, findUniqueMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemAiDailyUsage: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/src/lib/ai/engine/pacific-time", () => ({
  getTodayPacificDateString: () => "2026-07-05",
}));

vi.mock("@/src/lib/ai/engine/enhance-diagnostics", () => ({
  logEnhance: vi.fn(),
}));

import {
  checkGlobalSystemQuota,
  incrementGlobalDeepSeekPaidCall,
  incrementGlobalOpenRouterCall,
  incrementGlobalSystemEnhancement,
} from "@/src/lib/ai/engine/global-system-quota";

describe("checkGlobalSystemQuota", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockResolvedValue({
      date: "2026-07-05",
      openRouterCalls: 0,
      systemEnhancements: 0,
      deepSeekPaidCalls: 0,
    });
  });

  it("allows calls under the global OpenRouter free cap", async () => {
    const result = await checkGlobalSystemQuota(AI_ENGINE_DEFAULTS, {
      estimatedOpenRouterCalls: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("blocks when global OpenRouter free cap would be exceeded", async () => {
    upsertMock.mockResolvedValue({
      date: "2026-07-05",
      openRouterCalls: 999,
      systemEnhancements: 0,
      deepSeekPaidCalls: 0,
    });

    const result = await checkGlobalSystemQuota(AI_ENGINE_DEFAULTS, {
      estimatedOpenRouterCalls: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("global_call_limit");
    }
  });

  it("blocks when global system enhancement cap is reached", async () => {
    upsertMock.mockResolvedValue({
      date: "2026-07-05",
      openRouterCalls: 0,
      systemEnhancements: 200,
      deepSeekPaidCalls: 0,
    });

    const result = await checkGlobalSystemQuota(AI_ENGINE_DEFAULTS, {
      isEnhancement: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("global_enhancement_limit");
    }
  });
});

describe("incrementGlobalSystemQuota counters", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({});
  });

  it("increments OpenRouter free calls", async () => {
    await incrementGlobalOpenRouterCall();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { openRouterCalls: { increment: 1 } },
      }),
    );
  });

  it("increments DeepSeek paid overflow calls", async () => {
    await incrementGlobalDeepSeekPaidCall();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { deepSeekPaidCalls: { increment: 1 } },
      }),
    );
  });

  it("increments global system enhancements", async () => {
    await incrementGlobalSystemEnhancement();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { systemEnhancements: { increment: 1 } },
      }),
    );
  });
});
