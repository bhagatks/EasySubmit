/**
 * Gate-level switch matrix — G1–G6 + three-tier AI control.
 * Run: npx vitest run --config config/vitest.config.ts lib/job-tracker/enhance/enhance-qa-gate-matrix.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    enabled: true,
    quotas: {
      system: {
        dailyTotalSystemCalls: 1000,
        dailyTotalSystemEnhancements: 200,
        dailyUserCalls: 20,
        dailyUserEnhancements: 10,
      },
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
    provider: "gemini",
    modelId: "gemini-2.5-flash-lite",
  })),
}));

vi.mock("@/src/lib/ai/engine/system-quota-gate", () => ({
  resolveQuotaRowWithReset: vi.fn(() => ({
    quotaRow: { aiEnhancementsToday: 0, aiCallsToday: 0, aiQuotaResetAt: null },
    resetPatch: null,
  })),
}));

vi.mock("@/src/lib/ai/engine/quota", () => ({
  checkAiQuota: vi.fn(() => ({ ok: true })),
}));

import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { getAppConfig } from "@/src/lib/services/config-service";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";

const baseUser: SystemQuotaUserRow = {
  id: "qa-user",
  aiSourcePreference: "auto",
  vaultKeyId: null,
  activeProvider: null,
  systemAiEnabled: true,
  plan: "free",
  subscriptionStatus: null,
  aiEnhancementsToday: 0,
  aiCallsToday: 0,
  aiQuotaResetAt: new Date(),
};

describe("enhance QA gate matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAiGloballyEnabled).mockReturnValue(true);
    vi.mocked(isSystemAiEnabled).mockReturnValue(true);
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: true,
      systemAiEnabled: true,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    vi.mocked(getAppConfig).mockResolvedValue({
      enabled: true,
      quotas: {
        system: {
        dailyTotalSystemCalls: 1000,
        dailyTotalSystemEnhancements: 200,
        dailyUserCalls: 20,
        dailyUserEnhancements: 10,
      },
        customer: { dailyEnhancements: 5, dailyCalls: 10 },
      },
      providers: {},
    } as Awaited<ReturnType<typeof getAppConfig>>);
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "system",
      provider: "gemini",
      modelId: "gemini-2.5-flash-lite",
    });
  });

  it("S01 G3 user aiSourcePreference=disabled → baseline only", async () => {
    const r = await resolveEnhanceFeature(
      { ...baseUser, aiSourcePreference: "disabled" },
      "job_apply",
    );
    expect(r.aiAvailable).toBe(false);
    expect(r.baselineAvailable).toBe(true);
    expect(r.reason).toBe("user_disabled");
  });

  it("S02 dev forceAiEnabled bypasses user disabled", async () => {
    const r = await resolveEnhanceFeature(
      { ...baseUser, aiSourcePreference: "disabled" },
      "job_apply",
      { forceAiEnabled: true, forceSystem: true },
    );
    expect(r.aiAvailable).toBe(true);
    expect(r.mode).toBe("system");
  });

  it("S03 G1 global kill switch → baseline only", async () => {
    vi.mocked(isAiGloballyEnabled).mockReturnValue(false);
    const r = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(r.aiAvailable).toBe(false);
    expect(r.reason).toBe("globally_disabled");
  });

  it("S04 G2 feature flag off → baseline only", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: false,
      systemAiEnabled: true,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    const r = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(r.aiAvailable).toBe(false);
    expect(r.baselineAvailable).toBe(true);
    expect(r.reason).toBe("feature_disabled");
  });

  it("S05 G4 system engine off + no BYOK → no route", async () => {
    vi.mocked(getAppConfig).mockResolvedValue({
      enabled: false,
      quotas: {
        system: {
        dailyTotalSystemCalls: 1000,
        dailyTotalSystemEnhancements: 200,
        dailyUserCalls: 20,
        dailyUserEnhancements: 10,
      },
        customer: { dailyEnhancements: 5, dailyCalls: 10 },
      },
      providers: {},
    } as Awaited<ReturnType<typeof getAppConfig>>);
    vi.mocked(resolveAiRoute).mockResolvedValue({ error: "no_system_key" });
    const r = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(r.aiAvailable).toBe(false);
    expect(r.reason).toBe("no_key");
  });

  it("S06 user systemAiEnabled=false (free) → baseline only", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({ error: "no_system_key" });
    const r = await resolveEnhanceFeature(
      { ...baseUser, systemAiEnabled: false, vaultKeyId: null },
      "job_apply",
    );
    expect(r.aiAvailable).toBe(false);
  });

  it("S11 G4 feature flag system_ai_enabled off, no BYOK → baseline only", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: true,
      systemAiEnabled: false,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    vi.mocked(isSystemAiEnabled).mockReturnValue(false);
    vi.mocked(resolveAiRoute).mockResolvedValue({ error: "no_system_key" });
    const r = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(r.aiAvailable).toBe(false);
    expect(r.baselineAvailable).toBe(true);
    expect(r.reason).toBe("no_key");
    expect(resolveAiRoute).toHaveBeenCalledWith(
      expect.objectContaining({ userSystemAiEnabled: false }),
    );
  });

  it("S11b G4 feature flag off, BYOK user → customer AI available", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValue({
      enhanceWithAiResumeProfile: true,
      systemAiEnabled: false,
    } as Awaited<ReturnType<typeof getFeatureFlags>>);
    vi.mocked(isSystemAiEnabled).mockReturnValue(false);
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      modelId: "gpt-4o",
      modelCandidates: ["gpt-4o"],
      provider: "openai",
      vaultKeyId: "vault-1",
    });
    const r = await resolveEnhanceFeature(
      { ...baseUser, vaultKeyId: "vault-1", activeProvider: "openai" },
      "job_apply",
    );
    expect(r.aiAvailable).toBe(true);
    expect(r.mode).toBe("customer");
    expect(resolveAiRoute).toHaveBeenCalledWith(
      expect.objectContaining({ userSystemAiEnabled: false }),
    );
  });

  it("S07 default free user → system AI available", async () => {
    const r = await resolveEnhanceFeature(baseUser, "job_apply");
    expect(r.aiAvailable).toBe(true);
    expect(r.mode).toBe("system");
  });

  it("S08 BYOK customer preference with vault key", async () => {
    vi.mocked(resolveAiRoute).mockResolvedValue({
      mode: "customer",
      modelId: "gpt-4o",
      modelCandidates: ["gpt-4o"],
      provider: "openai",
      vaultKeyId: "vault-1",
    });
    const r = await resolveEnhanceFeature(
      { ...baseUser, aiSourcePreference: "customer", vaultKeyId: "vault-1", activeProvider: "openai" },
      "job_apply",
    );
    expect(r.aiAvailable).toBe(true);
    expect(r.mode).toBe("customer");
  });

  it("S09 forceSystem uses system even with vault key", async () => {
    await resolveEnhanceFeature(
      { ...baseUser, vaultKeyId: "vault-1", activeProvider: "openai" },
      "job_apply",
      { forceSystem: true, useCustomerKey: false },
    );
    expect(resolveAiRoute).toHaveBeenCalledWith(
      expect.objectContaining({ forceSystem: true, allowByokFallback: false }),
    );
  });

  it("S10 aiSourcePreference=system routes to system pool", async () => {
    const r = await resolveEnhanceFeature(
      { ...baseUser, aiSourcePreference: "system" },
      "job_apply",
    );
    expect(r.aiAvailable).toBe(true);
    expect(r.mode).toBe("system");
  });
});
