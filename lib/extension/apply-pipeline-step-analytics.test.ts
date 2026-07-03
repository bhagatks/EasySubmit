import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/services/feature-flags-service", () => ({
  FEATURE_FLAG_KEYS: {
    extensionApplyPipelineStepAnalytics: "extension_apply_pipeline_step_analytics",
  },
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from "@/src/lib/services/feature-flags-service";
import { isApplyPipelineStepAnalyticsEnabled } from "@/lib/extension/apply-pipeline-step-analytics";
import { isApplyPipelineStepAnalyticsEnabledClient } from "@/src/shared/extension/apply-pipeline-step-analytics-gate";

describe("isApplyPipelineStepAnalyticsEnabled (server)", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    vi.mocked(isFeatureEnabled).mockReset();
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("is off under vitest NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";
    await expect(isApplyPipelineStepAnalyticsEnabled()).resolves.toBe(false);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("follows feature_flags in dev and prod", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    await expect(isApplyPipelineStepAnalyticsEnabled()).resolves.toBe(true);

    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "prod";
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    await expect(isApplyPipelineStepAnalyticsEnabled()).resolves.toBe(false);
  });
});

describe("isApplyPipelineStepAnalyticsEnabledClient", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("is off under vitest", () => {
    process.env.NODE_ENV = "test";
    expect(isApplyPipelineStepAnalyticsEnabledClient(true)).toBe(false);
  });

  it("mirrors runtime config flag from feature_flags", () => {
    process.env.NODE_ENV = "development";
    expect(isApplyPipelineStepAnalyticsEnabledClient(false)).toBe(false);
    expect(isApplyPipelineStepAnalyticsEnabledClient(true)).toBe(true);
    expect(isApplyPipelineStepAnalyticsEnabledClient(null)).toBe(false);
  });
});
