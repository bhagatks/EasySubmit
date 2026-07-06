import { describe, expect, it } from "vitest";
import { isEnhanceAuthFailure } from "@/lib/ai/enhance-failure-messages";
import { shouldRetryEnhanceWithSystemPool } from "@/lib/job-tracker/enhance/byok-auth-system-fallback";

describe("isEnhanceAuthFailure", () => {
  it("detects rejected BYOK from provider_error + auth message", () => {
    expect(
      isEnhanceAuthFailure("provider_error", "401 unauthorized api key was rejected"),
    ).toBe(true);
  });

  it("ignores overload errors", () => {
    expect(isEnhanceAuthFailure("provider_error", "503 service unavailable")).toBe(false);
  });
});

describe("shouldRetryEnhanceWithSystemPool", () => {
  it("retries only for customer-route auth failures", () => {
    expect(
      shouldRetryEnhanceWithSystemPool({
        routeMode: "customer",
        code: "provider_error",
        error: "401 unauthorized",
      }),
    ).toBe(true);
    expect(
      shouldRetryEnhanceWithSystemPool({
        routeMode: "system",
        code: "provider_error",
        error: "401 unauthorized",
      }),
    ).toBe(false);
  });
});
