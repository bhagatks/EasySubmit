import { describe, expect, it } from "vitest";
import { resolveJdExtractFeature } from "@/lib/features/resolve-jd-extract";
import type { FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";

const baseFlags: FeatureFlagsSnapshot = {
  enhanceWithAiResumeProfile: true,
  extensionGlobalSwitch: true,
  extensionAutoApply: true,
  extensionApplyPipelineStepAnalytics: false,
  systemAiEnabled: true,
  aiJdExtractEnabled: true,
};

describe("resolveJdExtractFeature", () => {
  it("runs AI when ai_jd_extract_enabled is on", () => {
    expect(resolveJdExtractFeature(baseFlags).shouldRunAiExtract).toBe(true);
  });

  it("skips AI when ai_jd_extract_enabled is off", () => {
    expect(
      resolveJdExtractFeature({ ...baseFlags, aiJdExtractEnabled: false }).shouldRunAiExtract,
    ).toBe(false);
  });
});
