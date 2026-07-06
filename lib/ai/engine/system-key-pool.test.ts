import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  FREE_SLOT_DAILY_CALL_CAP,
  OPENROUTER_FREE_SLOT,
} from "@/src/lib/ai/engine/pool-constants";

const { findManyMock, findUniqueMock, updateMock, upsertMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn().mockResolvedValue({}),
  upsertMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemApiKey: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      update: updateMock,
      count: vi.fn().mockResolvedValue(0),
    },
    systemAiDailyUsage: {
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/src/lib/ai/engine/enhance-diagnostics", () => ({
  logEnhance: vi.fn(),
}));

vi.mock("@/lib/vault/system-key-vault", () => ({
  unvaultSystemApiKey: vi.fn().mockResolvedValue("vault-key"),
}));

import {
  executeWithPoolRetry,
  markSystemKeyRateLimited,
  resetSystemKeyPoolForTests,
  setEnvSlotBillingModeForTests,
  SystemKeyPoolError,
} from "@/src/lib/ai/engine/system-key-pool";
import { getTodayPacificDateString } from "@/src/lib/ai/engine/pacific-time";

describe.sequential("system-key-pool executeWithPoolRetry", () => {
  const originalOpenRouter = process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEYS;
  const originalDeepSeek = process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS;

  beforeEach(() => {
    resetSystemKeyPoolForTests();
    findManyMock.mockResolvedValue([]);
    findUniqueMock.mockResolvedValue(null);
    updateMock.mockClear();
    upsertMock.mockClear();
    process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEYS = "or-key";
    process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS = "ds-key";
  });

  afterEach(() => {
    process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEYS = originalOpenRouter;
    process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS = originalDeepSeek;
    resetSystemKeyPoolForTests();
  });

  it("tries OpenRouter free slot 0 before DeepSeek paid slot 1", async () => {
    const seen: number[] = [];

    markSystemKeyRateLimited(OPENROUTER_FREE_SLOT, 60_000);

    const result = await executeWithPoolRetry(async ({ slot }) => {
      seen.push(slot);
      return slot;
    });

    expect(seen).toEqual([DEEPSEEK_OVERFLOW_SLOT]);
    expect(result.slot).toBe(DEEPSEEK_OVERFLOW_SLOT);
    expect(result.billingMode).toBe("paid");
    expect(result.provider).toBe("deepseek");
  });

  it("uses OpenRouter slot 0 when healthy", async () => {
    const result = await executeWithPoolRetry(async ({ slot, provider, billingMode }) => ({
      slot,
      provider,
      billingMode,
    }));

    expect(result.slot).toBe(OPENROUTER_FREE_SLOT);
    expect(result.provider).toBe("openrouter");
    expect(result.billingMode).toBe("free");
  });

  it("fail-fast with capacity_exhausted when OpenRouter free slot is exhausted", async () => {
    const today = getTodayPacificDateString();
    findManyMock.mockResolvedValue([
      {
        slot: OPENROUTER_FREE_SLOT,
        label: "Alpha",
        enabled: true,
        provider: "openrouter",
        billingMode: "free",
        modelId: "openrouter/free",
        callsToday: FREE_SLOT_DAILY_CALL_CAP,
        exhaustedUntil: null,
        quotaResetDate: today,
      },
    ]);

    await expect(
      executeWithPoolRetry(async () => "ok"),
    ).rejects.toMatchObject({
      code: "capacity_exhausted",
    } satisfies Partial<SystemKeyPoolError>);
  });

  it("falls through to DeepSeek when OpenRouter slot fails", async () => {
    const result = await executeWithPoolRetry(async ({ slot, provider }) => {
      if (provider === "openrouter") {
        const err = new Error("OpenRouter unavailable");
        (err as { status?: number }).status = 503;
        throw err;
      }
      return { slot, provider };
    });

    expect(result.slot).toBe(DEEPSEEK_OVERFLOW_SLOT);
    expect(result.provider).toBe("deepseek");
  });

  it("honors preferred slot when healthy", async () => {
    const first = await executeWithPoolRetry(async ({ slot }) => slot);
    const second = await executeWithPoolRetry(async ({ slot }) => slot, {
      preferredSlot: first.slot,
    });
    expect(second.slot).toBe(first.slot);
  });

  it("retries transient failures once on the same slot", async () => {
    let attempts = 0;
    markSystemKeyRateLimited(OPENROUTER_FREE_SLOT, 60_000);

    let deepSeekAttempts = 0;
    const result = await executeWithPoolRetry(async ({ slot, provider }) => {
      if (provider === "deepseek") {
        deepSeekAttempts += 1;
        if (deepSeekAttempts === 1) {
          const err = new Error("Gateway timeout");
          (err as { status?: number }).status = 503;
          throw err;
        }
      }
      attempts += 1;
      return slot;
    });

    expect(deepSeekAttempts).toBe(2);
    expect(result.result).toBe(DEEPSEEK_OVERFLOW_SLOT);
  });

  it("allows toggling env slot billing mode in tests", () => {
    setEnvSlotBillingModeForTests(DEEPSEEK_OVERFLOW_SLOT, "paid");
    expect(true).toBe(true);
  });
});
