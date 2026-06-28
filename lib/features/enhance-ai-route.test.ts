import { describe, expect, it } from "vitest";
import { enhanceFeatureRoute, isResolvedAiRoute } from "@/lib/features/enhance-ai-route";

describe("enhanceFeatureRoute", () => {
  it("returns null when AI is unavailable", () => {
    expect(
      enhanceFeatureRoute({
        baselineAvailable: true,
        aiAvailable: false,
        available: false,
        reason: "quota_exceeded",
        route: null,
        mode: null,
        vaultKeyId: null,
        provider: null,
        modelId: null,
        quota: { used: 5, limit: 5, unlimited: false },
        fallbackAvailable: true,
      }),
    ).toBeNull();
  });

  it("returns customer route when BYOK is active", () => {
    const route = {
      mode: "customer" as const,
      modelId: "gpt-4o",
      provider: "openai",
      vaultKeyId: "vault-1",
    };
    expect(
      enhanceFeatureRoute({
        baselineAvailable: true,
        aiAvailable: true,
        available: true,
        route,
        mode: "customer",
        vaultKeyId: "vault-1",
        provider: "openai",
        modelId: "gpt-4o",
        quota: { used: 0, limit: Infinity, unlimited: true },
        fallbackAvailable: true,
      }),
    ).toEqual(route);
  });
});

describe("isResolvedAiRoute", () => {
  it("accepts valid routes", () => {
    expect(isResolvedAiRoute({ mode: "system", modelId: "gemini-1.5-flash" })).toBe(true);
  });

  it("rejects error objects", () => {
    expect(isResolvedAiRoute({ error: "no_customer_key" })).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isResolvedAiRoute(null)).toBe(false);
    expect(isResolvedAiRoute(undefined)).toBe(false);
  });
});
