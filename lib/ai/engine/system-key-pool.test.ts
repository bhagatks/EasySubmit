import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  FREE_SLOT_DAILY_CALL_CAP,
  PLATFORM_DAILY_CALL_CAP,
} from "@/src/lib/ai/engine/pool-constants";

const { findManyMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemApiKey: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      update: updateMock,
      count: vi.fn().mockResolvedValue(0),
    },
  },
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
  const original = process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS;

  beforeEach(() => {
    resetSystemKeyPoolForTests();
    findManyMock.mockResolvedValue([]);
    findUniqueMock.mockResolvedValue(null);
    updateMock.mockClear();
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS = "k-alpha,k-beta,k-gamma";
  });

  afterEach(() => {
    process.env.EASYSUBMIT_SYSTEM_GEMINI_API_KEYS = original;
    resetSystemKeyPoolForTests();
  });

  it("selects env keys with least-calls spread", async () => {
    const seen: number[] = [];

    for (let i = 0; i < 3; i += 1) {
      const result = await executeWithPoolRetry(async ({ slot, apiKey }) => {
        seen.push(slot);
        return apiKey;
      });
      expect(result.keySource).toBe("env");
    }

    expect(new Set(seen).size).toBe(3);
  });

  it("fail-fast with capacity_exhausted when platform cap reached", async () => {
    const today = getTodayPacificDateString();
    findManyMock.mockResolvedValue([
      {
        slot: 0,
        label: "Alpha",
        enabled: true,
        billingMode: "free",
        modelId: "gemini-2.5-flash-lite",
        callsToday: 1000,
        exhaustedUntil: null,
        quotaResetDate: today,
      },
      {
        slot: 1,
        label: "Beta",
        enabled: true,
        billingMode: "free",
        modelId: "gemini-2.5-flash-lite",
        callsToday: 1000,
        exhaustedUntil: null,
        quotaResetDate: today,
      },
      {
        slot: 2,
        label: "Gamma",
        enabled: true,
        billingMode: "free",
        modelId: "gemini-2.5-flash-lite",
        callsToday: 1000,
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

  it("skips RPM-cooling slots without sleeping", async () => {
    markSystemKeyRateLimited(0, 60_000);
    markSystemKeyRateLimited(1, 60_000);

    const result = await executeWithPoolRetry(async ({ slot }) => slot);
    expect(result.slot).toBe(2);
    expect(result.label).toBe("Gamma");
  });

  it("routes to Gamma paid overflow only when Alpha and Beta are dead", async () => {
    setEnvSlotBillingModeForTests(2, "paid");
    markSystemKeyRateLimited(0, 60_000);
    markSystemKeyRateLimited(1, 60_000);

    const result = await executeWithPoolRetry(async ({ slot }) => slot);
    expect(result.slot).toBe(2);
    expect(result.billingMode).toBe("paid");
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
    const result = await executeWithPoolRetry(async ({ slot }) => {
      attempts += 1;
      if (attempts === 1) {
        const err = new Error("Gateway timeout");
        (err as { status?: number }).status = 503;
        throw err;
      }
      return slot;
    });

    expect(attempts).toBe(2);
    expect(result.result).toBe(result.slot);
  });
});

describe("pool constants", () => {
  it("uses locked v1 caps", () => {
    expect(PLATFORM_DAILY_CALL_CAP).toBe(3000);
    expect(FREE_SLOT_DAILY_CALL_CAP).toBe(1000);
  });
});
