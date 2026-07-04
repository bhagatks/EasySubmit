import { describe, expect, it } from "vitest";
import {
  isJdExtractionSuitableModel,
  JD_EXTRACTION_CUSTOMER_DEFAULTS,
  resolveJdExtractionCustomerModel,
  resolveJdExtractionCustomerRoute,
} from "@/lib/job-tracker/jd/resolve-jd-extraction-model";
import { GEMINI_JD_EXTRACT_MODEL } from "@/src/lib/ai/engine/gemini-resilience";

/** @deprecated JD extract now uses the enhance route directly — these helpers remain for legacy callers. */

describe("isJdExtractionSuitableModel", () => {
  it("rejects slow Anthropic Opus models", () => {
    expect(isJdExtractionSuitableModel("anthropic", "claude-opus-4-7")).toBe(false);
    expect(isJdExtractionSuitableModel("anthropic", "claude-3-opus-latest")).toBe(false);
  });

  it("accepts fast Anthropic Haiku and Sonnet", () => {
    expect(isJdExtractionSuitableModel("anthropic", "claude-3-5-haiku-20241022")).toBe(true);
    expect(isJdExtractionSuitableModel("anthropic", "claude-sonnet-4-20250514")).toBe(true);
  });

  it("accepts Gemini flash utility models", () => {
    expect(isJdExtractionSuitableModel("gemini", GEMINI_JD_EXTRACT_MODEL)).toBe(true);
    expect(isJdExtractionSuitableModel("gemini", "gemini-2.5-flash")).toBe(true);
  });
});

describe("resolveJdExtractionCustomerModel (legacy)", () => {
  it("uses Haiku default instead of Opus enhance model", () => {
    expect(
      resolveJdExtractionCustomerModel(
        "anthropic",
        "claude-opus-4-7",
        GEMINI_JD_EXTRACT_MODEL,
        ["claude-opus-4-7", "claude-3-5-haiku-20241022"],
      ),
    ).toBe("claude-3-5-haiku-20241022");
  });
});

describe("resolveJdExtractionCustomerRoute (legacy)", () => {
  it("prefers verified Sonnet when the key has no Haiku access", () => {
    const route = resolveJdExtractionCustomerRoute(
      {
        mode: "customer",
        provider: "anthropic",
        vaultKeyId: "vault-1",
        modelId: "claude-opus-4-5-20251101",
        modelCandidates: [
          "claude-opus-4-5-20251101",
          "claude-opus-4-7",
          "claude-sonnet-4-5-20250929",
        ],
      },
      GEMINI_JD_EXTRACT_MODEL,
    );

    expect(route.modelId).toBe("claude-sonnet-4-5-20250929");
    expect(route.modelCandidates).toEqual([
      "claude-sonnet-4-5-20250929",
      "claude-3-5-haiku-20241022",
    ]);
  });
});
