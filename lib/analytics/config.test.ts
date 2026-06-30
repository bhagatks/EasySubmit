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

  it("getAnalyticsConfig reads NEXT_PUBLIC_POSTHOG_KEY from env", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_testkey123";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "prod";
    const { getAnalyticsConfig } = await import("@/src/shared/analytics/config");
    const config = getAnalyticsConfig();
    expect(config.enabled).toBe(true);
    expect(config.key).toBe("phc_testkey123");
    expect(config.environment).toBe("prod");
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
    Object.assign(process.env, { NODE_ENV: "development" });
    const { isDevAnalyticsEnvironment, isEnhanceJourneyDebugEnabled } = await import(
      "@/src/shared/analytics/config"
    );
    expect(isDevAnalyticsEnvironment()).toBe(true);
    expect(isEnhanceJourneyDebugEnabled()).toBe(true);
  });
});
