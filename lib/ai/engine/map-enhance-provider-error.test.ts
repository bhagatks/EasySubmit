import { describe, expect, it } from "vitest";
import {
  mapEnhanceProviderError,
  parseRetryAfterSeconds,
} from "@/src/lib/ai/engine/map-enhance-provider-error";

const GEMINI_QUOTA =
  'Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash\nPlease retry in 55.372153965s.';

describe("mapEnhanceProviderError", () => {
  it("parses retry-after seconds from Gemini quota errors", () => {
    expect(parseRetryAfterSeconds(GEMINI_QUOTA)).toBe(56);
  });

  it("maps Gemini free-tier quota to insufficient_quota with friendly copy", () => {
    const mapped = mapEnhanceProviderError(new Error(GEMINI_QUOTA), { aiMode: "system" });

    expect(mapped.code).toBe("insufficient_quota");
    expect(mapped.userMessage).toContain("EasySubmit's shared AI");
    expect(mapped.userMessage).toContain("56 seconds");
    expect(mapped.userMessage).not.toContain("generativelanguage.googleapis.com");
    expect(mapped.modelId).toBe("gemini-2.5-flash");
  });

  it("maps BYOK quota to customer-facing copy", () => {
    const mapped = mapEnhanceProviderError(new Error(GEMINI_QUOTA), { aiMode: "customer" });

    expect(mapped.code).toBe("insufficient_quota");
    expect(mapped.userMessage).toContain("Your API key");
    expect(mapped.userMessage).toContain("provider quota");
    expect(mapped.userMessage).not.toContain("Google AI Studio");
  });

  it("maps rate limit without quota wording", () => {
    const mapped = mapEnhanceProviderError(
      new Error("429 Too Many Requests — Please retry in 12.5s"),
    );

    expect(mapped.code).toBe("rate_limited");
    expect(mapped.userMessage).toContain("13 seconds");
  });
});
