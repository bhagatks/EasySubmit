import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveResumeRulesV2ForPageMode } from "@/lib/resume/v2/runtime";

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  getFeatureFlags: vi.fn(async () => ({
    resumeRulesV2: true,
  })),
}));

import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { resolveResumeRulesV2Feature } from "@/lib/features/resolve-resume-rules-v2";

describe("resolveResumeRulesV2ForPageMode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables v2 for page mode 2 when feature flag is on", () => {
    const result = resolveResumeRulesV2ForPageMode("2", true);
    expect(result.enabled).toBe(true);
    expect(result.pageMode).toBe("2");
  });

  it("disables v2 when feature flag is off", () => {
    const result = resolveResumeRulesV2ForPageMode("2", false);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("feature_disabled");
  });

  it("enables v2 for all implemented page modes including 4+", () => {
    for (const mode of ["1", "2", "3", "4+"] as const) {
      const result = resolveResumeRulesV2ForPageMode(mode, true);
      expect(result.enabled).toBe(true);
      expect(result.pageMode).toBe(mode);
      expect(result.profileImplemented).toBe(true);
    }
  });

  it("respects RESUME_RULES_V2_ENABLED env override", () => {
    vi.stubEnv("RESUME_RULES_V2_ENABLED", "true");
    const result = resolveResumeRulesV2ForPageMode("2", false);
    expect(result.enabled).toBe(true);
  });
});

describe("resolveResumeRulesV2Feature", () => {
  it("loads feature flag from getFeatureFlags", async () => {
    vi.mocked(getFeatureFlags).mockResolvedValueOnce({
      enhanceWithAiResumeProfile: true,
      extensionGlobalSwitch: true,
      extensionAutoApply: true,
      extensionApplyPipelineStepAnalytics: false,
      systemAiEnabled: true,
      aiJdExtractEnabled: false,
      resumeRulesV2: true,
    });

    const result = await resolveResumeRulesV2Feature(
      { id: "user-1" },
      "job_apply",
      "2",
    );
    expect(result.enabled).toBe(true);
  });
});
