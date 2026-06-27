import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

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
  getAppConfig: vi.fn(async () => ({
    quotas: {
      system: { dailyEnhancements: 10, dailyCalls: 20, enable: true },
      customer: { dailyEnhancements: 5, dailyCalls: 10 },
    },
    providers: {},
  })),
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

import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";
import { isSubscribed } from "@/src/lib/services/config-service";

const baseUser: SystemQuotaUserRow = {
  id: "user-1",
  aiSourcePreference: "auto",
  vaultKeyId: null,
  activeProvider: null,
  plan: "free",
  subscriptionStatus: null,
  aiEnhancementsToday: 0,
  aiCallsToday: 0,
  aiQuotaResetAt: new Date(),
};

describe("resolveEnhanceFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAiGloballyEnabled).mockReturnValue(true);
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: true,
      systemAiEnabled: true,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "system",
      modelId: "gemini-1.5-flash",
    });
    vi.mocked(checkAiQuota).mockReturnValue({ ok: true } as ReturnType<typeof checkAiQuota>);
    vi.mocked(isSubscribed).mockReturnValue(false);
  });

  // ── G1: global kill switch ────────────────────────────────────────────────────

  it("G1: returns globally_disabled when AI env is off", async () => {
    vi.mocked(isAiGloballyEnabled).mockReturnValue(false);
    const result = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("globally_disabled");
  });

  // ── Onboarding: always deterministic ─────────────────────────────────────────

  it("onboarding surface always returns unavailable (deterministic path)", async () => {
    const result = await resolveEnhanceFeature(baseUser, "onboarding");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("user_disabled");
  });

  // ── G2: feature flag ─────────────────────────────────────────────────────────

  it("G2: returns feature_disabled when flag is off", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: false,
      systemAiEnabled: true,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    const result = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("feature_disabled");
  });

  // ── G3: user preference ───────────────────────────────────────────────────────

  it("G3: returns user_disabled when user has AI disabled", async () => {
    const user = { ...baseUser, aiSourcePreference: "disabled" };
    const result = await resolveEnhanceFeature(user, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("user_disabled");
  });

  // ── G4+G5: route resolution ───────────────────────────────────────────────────

  it("G5: returns no_key when route resolution fails with no_customer_key", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({ error: "no_customer_key" });
    const result = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("no_key");
  });

  it("G5: returns pool_down when system pool is exhausted", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({
      error: "system_pool_exhausted",
      byokAvailable: false,
    });
    const result = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("pool_down");
  });

  // ── G6: quota ─────────────────────────────────────────────────────────────────

  it("G6: returns quota_exceeded when customer quota is exhausted", async () => {
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
    const user = { ...baseUser, vaultKeyId: "vault-1" };
    const result = await resolveEnhanceFeature(user, "job_apply");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("quota_exceeded");
  });

  it("G6: subscribed users skip quota gate", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      modelId: "gpt-4o",
      provider: "openai",
      vaultKeyId: "vault-1",
    });
    vi.mocked(isSubscribed).mockReturnValue(true);
    vi.mocked(checkAiQuota).mockReturnValue({
      ok: false,
      reason: "enhancement_limit",
      snapshot: { enhancementsLimit: 5, callsLimit: 10 },
    } as ReturnType<typeof checkAiQuota>);
    const user = { ...baseUser, vaultKeyId: "vault-1", plan: "pro", subscriptionStatus: "active" };
    const result = await resolveEnhanceFeature(user, "job_apply");
    expect(result.available).toBe(true);
  });

  // ── Happy path ────────────────────────────────────────────────────────────────

  it("happy path: returns available with system mode", async () => {
    const result = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(result.available).toBe(true);
    expect(result.mode).toBe("system");
    expect(result.fallbackAvailable).toBe(true);
  });

  it("happy path: extension surface same as job_apply", async () => {
    const result = await resolveEnhanceFeature(baseUser, "extension");
    expect(result.available).toBe(true);
  });
});
