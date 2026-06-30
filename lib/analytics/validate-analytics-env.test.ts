import { describe, expect, it } from "vitest";
import {
  validateAnalyticsEnv,
  validateAnalyticsEnvForDeploy,
} from "../../scripts/validate-analytics-env.mjs";

describe("validateAnalyticsEnv", () => {
  it("fails production build when key is empty", () => {
    const result = validateAnalyticsEnv({
      VERCEL: "1",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_ANALYTICS_ENV: "prod",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "",
    });
    expect(result.ok).toBe(false);
  });

  it("passes production build with valid analytics env", () => {
    const result = validateAnalyticsEnv({
      VERCEL: "1",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_ANALYTICS_ENV: "prod",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_testkey123",
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
  });

  it("skips strict checks outside Vercel production", () => {
    const result = validateAnalyticsEnv({
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_POSTHOG_KEY: "",
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("validates pulled deploy env for non-empty PostHog key", () => {
    const bad = validateAnalyticsEnvForDeploy({
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_ANALYTICS_ENV: "prod",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "",
    });
    expect(bad.ok).toBe(false);

    const good = validateAnalyticsEnvForDeploy({
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_ANALYTICS_ENV: "prod",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_testkey123",
    });
    expect(good.ok).toBe(true);
  });
});
