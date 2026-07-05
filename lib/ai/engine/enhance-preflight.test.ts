import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features", () => ({
  resolveFeature: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  getFeatureFlags: vi.fn(),
  isSystemAiEnabled: vi.fn(() => true),
  FEATURE_FLAGS_DEFAULTS: {
    enhanceWithAiResumeProfile: true,
    extensionGlobalSwitch: true,
    extensionAutoApply: true,
    extensionApplyPipelineStepAnalytics: false,
    systemAiEnabled: true,
    aiJdExtractEnabled: false,
    resumeRulesV2: true,
  },
}));

import { getServerSession } from "next-auth";
import { resolveFeature } from "@/lib/features";
import { getFeatureFlags, isSystemAiEnabled, FEATURE_FLAGS_DEFAULTS } from "@/src/lib/services/feature-flags-service";
import { checkEnhanceWithAiPreflight } from "@/app/actions/ai/enhance-resume";

const defaultFlags = FEATURE_FLAGS_DEFAULTS;

describe("checkEnhanceWithAiPreflight", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(resolveFeature).mockReset();
    vi.mocked(getFeatureFlags).mockReset();
    vi.mocked(isSystemAiEnabled).mockReturnValue(true);
    vi.mocked(getFeatureFlags).mockResolvedValue(defaultFlags);
  });

  it("allows baseline when feature flag blocks AI", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(resolveFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: false,
    } as never);

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.baselineAvailable).toBe(true);
      expect(result.aiAvailable).toBe(false);
    }
  });

  it("allows baseline when BYOK is required but missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(resolveFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: false,
    } as never);
    vi.mocked(isSystemAiEnabled).mockReturnValue(false);

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.aiAvailable).toBe(false);
      expect(result.systemAiEnabled).toBe(false);
    }
  });

  it("allows rules-only enhance when global AI is off", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(resolveFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: false,
    } as never);

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.aiAvailable).toBe(false);
    }
  });

  it("opens path when preflight passes", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(resolveFeature).mockResolvedValue({
      baselineAvailable: true,
      aiAvailable: true,
    } as never);
    vi.mocked(isSystemAiEnabled).mockReturnValue(false);

    const result = await checkEnhanceWithAiPreflight({ variant: "dashboard" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.systemAiEnabled).toBe(false);
      expect(result.aiAvailable).toBe(true);
    }
  });
});
