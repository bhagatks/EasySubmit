import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFeature, enhanceFeatureRoute } from "@/lib/features/index";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/ai-global-enabled", () => ({
  isAiGloballyEnabled: vi.fn(() => true),
}));

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  getFeatureFlags: vi.fn(async () => ({
    enhanceWithAiResumeProfile: true,
    systemAiEnabled: true,
  })),
  isSystemAiEnabled: vi.fn(() => true),
}));

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(async (key: string) => {
    if (key === "aiEngine") {
      return {
        quotas: {
          system: { dailyEnhancements: 10, dailyCalls: 20, enable: true },
          customer: { dailyEnhancements: 5, dailyCalls: 10 },
        },
        providers: {},
      };
    }
    return {
      enabled: true,
      currency: "usd",
      plans: { pro: { dailyEnhancements: 100, price: 19 } },
    };
  }),
  isSubscribed: vi.fn(() => false),
}));

vi.mock("@/src/lib/services/ai-engine-config", () => ({
  isCustomerQuotaUnlimited: vi.fn(() => false),
  AI_ENGINE_DEFAULTS: {},
}));

vi.mock("@/src/lib/ai/engine/router", () => ({
  resolveAiRoute: vi.fn(async () => ({
    mode: "system",
    modelId: "gemini-1.5-flash",
  })),
}));

vi.mock("@/src/lib/ai/engine/system-quota-gate", () => ({
  resolveQuotaRowWithReset: vi.fn(() => ({
    quotaRow: {
      aiEnhancementsToday: 0,
      aiCallsToday: 0,
      aiQuotaResetAt: null,
    },
    resetPatch: null,
  })),
}));

vi.mock("@/src/lib/ai/engine/quota", () => ({
  checkAiQuota: vi.fn(() => ({ ok: true })),
}));

import { prisma } from "@/lib/prisma";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";
import { isSubscribed } from "@/src/lib/services/config-service";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";

const USER_ID = "user-123";

const baseUserRow: SystemQuotaUserRow = {
  aiSourcePreference: "auto",
  vaultKeyId: null,
  activeProvider: null,
  plan: "free",
  subscriptionStatus: null,
  aiEnhancementsToday: 0,
  aiCallsToday: 0,
  aiQuotaResetAt: new Date(),
};

function mockPrismaUser(user: SystemQuotaUserRow | null) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("resolveFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaUser(baseUserRow);
    vi.mocked(isAiGloballyEnabled).mockReturnValue(true);
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "system",
      modelId: "gemini-1.5-flash",
    });
    vi.mocked(checkAiQuota).mockReturnValue({ ok: true } as ReturnType<typeof checkAiQuota>);
    vi.mocked(isSubscribed).mockReturnValue(false);
  });

  it("throws when user is not found", async () => {
    mockPrismaUser(null);
    await expect(
      resolveFeature({ feature: "enhance", userId: USER_ID, surface: "job_apply" }),
    ).rejects.toThrow(/not found/);
  });

  it("enhance: routes system quota path on free user", async () => {
    const result = await resolveFeature({
      feature: "enhance",
      userId: USER_ID,
      surface: "job_apply",
    });
    expect(result.aiAvailable).toBe(true);
    expect(result.mode).toBe("system");
    expect(result.route).toEqual({ mode: "system", modelId: "gemini-1.5-flash" });
  });

  it("enhance: routes BYOK customer path when vault key present", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      modelId: "gpt-4o",
      provider: "openai",
      vaultKeyId: "vault-1",
    });
    mockPrismaUser({
      ...baseUserRow,
      vaultKeyId: "vault-1",
      activeProvider: "openai",
    });

    const result = await resolveFeature({
      feature: "enhance",
      userId: USER_ID,
      surface: "extension",
    });
    expect(result.aiAvailable).toBe(true);
    expect(result.mode).toBe("customer");
    expect(result.vaultKeyId).toBe("vault-1");
  });

  it("enhance: blocks when customer quota is exhausted", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      modelId: "gpt-4o",
      provider: "openai",
      vaultKeyId: "vault-1",
    });
    vi.mocked(checkAiQuota).mockReturnValue({
      ok: false,
      reason: "enhancement_limit",
      snapshot: { enhancementsLimit: 5, callsLimit: 10 },
    } as ReturnType<typeof checkAiQuota>);
    mockPrismaUser({ ...baseUserRow, vaultKeyId: "vault-1" });

    const result = await resolveFeature({
      feature: "enhance",
      userId: USER_ID,
      surface: "job_apply",
    });
    expect(result.aiAvailable).toBe(false);
    expect(result.reason).toBe("quota_exceeded");
  });

  it("subscription: resolves plan and upgrade nudge", async () => {
    const result = await resolveFeature({
      feature: "subscription",
      userId: USER_ID,
      surface: "job_apply",
    });
    expect(result.plan).toBe("free");
    expect(result.isSubscribed).toBe(false);
    expect(result.showUpgradeNudge).toBe(true);
  });

  it("subscription: subscribed user has unlimited limits", async () => {
    vi.mocked(isSubscribed).mockReturnValue(true);
    mockPrismaUser({ ...baseUserRow, plan: "pro", subscriptionStatus: "active" });

    const result = await resolveFeature({
      feature: "subscription",
      userId: USER_ID,
      surface: "job_apply",
    });
    expect(result.isSubscribed).toBe(true);
    expect(result.limits.unlimited).toBe(true);
    expect(result.showUpgradeNudge).toBe(false);
  });

  it("loads user via prisma with system quota select", async () => {
    await resolveFeature({ feature: "enhance", userId: USER_ID, surface: "resume" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        select: expect.objectContaining({
          vaultKeyId: true,
          plan: true,
        }),
      }),
    );
  });

  it("throws for unknown feature name", async () => {
    await expect(
      resolveFeature({
        feature: "unknown" as "enhance",
        userId: USER_ID,
        surface: "job_apply",
      }),
    ).rejects.toThrow(/unknown feature/);
  });
});

describe("enhanceFeatureRoute re-export", () => {
  it("returns route from enhance resolution", () => {
    const route = { mode: "system" as const, modelId: "gemini-1.5-flash" };
    expect(
      enhanceFeatureRoute({
        baselineAvailable: true,
        aiAvailable: true,
        available: true,
        route,
        mode: "system",
        vaultKeyId: null,
        provider: null,
        modelId: "gemini-1.5-flash",
        quota: { used: 0, limit: 10, unlimited: false },
        fallbackAvailable: true,
      }),
    ).toEqual(route);
  });
});
