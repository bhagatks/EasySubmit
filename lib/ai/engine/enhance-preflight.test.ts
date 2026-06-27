import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/ai-global-enabled", () => ({
  isAiGloballyEnabled: vi.fn(() => true),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(),
  isSubscribed: vi.fn(() => false),
}));

vi.mock("@/src/lib/services/feature-flags-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/services/feature-flags-service")>();
  return {
    ...actual,
    getFeatureFlags: vi.fn(),
  };
});

vi.mock("@/src/lib/ai/engine/router", () => ({
  resolveAiRoute: vi.fn(),
}));

vi.mock("@/lib/ai/ai-readiness-gate-for-user", () => ({
  getAiReadinessForUser: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { checkEnhanceWithAiPreflight } from "@/app/actions/ai/enhance-resume";

const baseUser = {
  vaultKeyId: null,
  activeProvider: null,
  aiSourcePreference: "auto",
  aiEnhancementsToday: 0,
  aiCallsToday: 0,
  aiQuotaResetAt: new Date(),
};

const aiEngineSystemOff = {
  system: { modelId: "gemini-2.5-flash-lite", maxKeySlots: 3 },
  quotas: {
    system: { enable: false, dailyEnhancements: 5, dailyCalls: 20 },
    customer: { aiDailyUnlimited: true, dailyEnhancements: 50, dailyCalls: 200 },
  },
  customerDailyEnhancementCap: 50,
};

const defaultFlags = {
  enhanceWithAiOnboarding: true,
  enhanceWithAiResumeProfile: true,
  extensionGlobalSwitch: true,
  extensionAutoApply: true,
  systemAiEnabled: true,
};

describe("checkEnhanceWithAiPreflight", () => {
  beforeEach(() => {
    vi.mocked(isAiGloballyEnabled).mockReturnValue(true);
    vi.mocked(getServerSession).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(getAppConfig).mockReset();
    vi.mocked(getFeatureFlags).mockReset();
    vi.mocked(resolveAiRoute).mockReset();
    vi.mocked(getAiReadinessForUser).mockReset();
    vi.mocked(getAiReadinessForUser).mockResolvedValue({
      status: { ok: true },
      reason: "ready",
      systemQuota: { applies: false, exceeded: false, reason: null, code: null },
      byokKey: { applies: true, valid: true, reason: null },
    } as never);
  });

  it("blocks when feature flag is off", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(getAppConfig).mockResolvedValue(aiEngineSystemOff as never);
    vi.mocked(getFeatureFlags).mockResolvedValue({
      ...defaultFlags,
      enhanceWithAiResumeProfile: false,
    });

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("feature_disabled");
    }
  });

  it("requires BYOK when system AI is disabled and no vault key", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(getAppConfig).mockResolvedValue(aiEngineSystemOff as never);
    vi.mocked(getFeatureFlags).mockResolvedValue({
      ...defaultFlags,
      systemAiEnabled: false,
    });
    vi.mocked(resolveAiRoute).mockResolvedValue({ error: "no_customer_key" });

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("no_customer_key");
      expect(result.requiresByokOnly).toBe(true);
    }
  });

  it("allows rules-only enhance when global AI is off", async () => {
    vi.mocked(isAiGloballyEnabled).mockReturnValue(false);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(getAppConfig).mockResolvedValue(aiEngineSystemOff as never);
    vi.mocked(getFeatureFlags).mockResolvedValue(defaultFlags);

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.aiAvailable).toBe(false);
    }
  });

  it("opens path when preflight passes", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
    } as never);
    vi.mocked(getAppConfig).mockResolvedValue(aiEngineSystemOff as never);
    vi.mocked(getFeatureFlags).mockResolvedValue({
      ...defaultFlags,
      systemAiEnabled: false,
    });
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      provider: "gemini",
      modelId: "gemini-2.5-flash",
      vaultKeyId: "vault-1",
    });

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.systemAiEnabled).toBe(false);
      expect(result.aiAvailable).toBe(true);
    }
  });
});
