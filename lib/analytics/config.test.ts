import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("analytics config", () => {
  const env = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("isDevAnalyticsEnvironment is false when env is prod", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "prod";
    const { isDevAnalyticsEnvironment, isEnhanceJourneyDebugEnabled } = await import(
      "@/src/shared/analytics/config"
    );
    expect(isDevAnalyticsEnvironment()).toBe(false);
    expect(isEnhanceJourneyDebugEnabled()).toBe(false);
  });

  it("isDevAnalyticsEnvironment is true when env is dev", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
    process.env.NODE_ENV = "development";
    const { isDevAnalyticsEnvironment, isEnhanceJourneyDebugEnabled } = await import(
      "@/src/shared/analytics/config"
    );
    expect(isDevAnalyticsEnvironment()).toBe(true);
    expect(isEnhanceJourneyDebugEnabled()).toBe(true);
  });
});
