import { describe, expect, it } from "vitest";
import {
  filterStructuredHealthyModels,
  isJdExtractionSuitableModel,
  rankJdExtractionCandidates,
  resolveJdExtractionCustomerModel,
  resolveJdExtractionCustomerRoute,
} from "@/lib/job-tracker/jd/resolve-jd-extraction-model";
import { GEMINI_JD_EXTRACT_MODEL } from "@/src/lib/ai/engine/gemini-resilience";

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

describe("rankJdExtractionCandidates", () => {
  it("puts fast utility models before slower suitable models", () => {
    expect(
      rankJdExtractionCandidates("anthropic", [
        "claude-opus-4-5-20251101",
        "claude-sonnet-4-5-20250929",
        "claude-3-5-haiku-20241022",
      ]),
    ).toEqual(["claude-3-5-haiku-20241022", "claude-sonnet-4-5-20250929"]);
  });
});

describe("filterStructuredHealthyModels", () => {
  it("keeps only healthy structured models not in cooldown", () => {
    const result = filterStructuredHealthyModels(
      ["claude-3-5-haiku-20241022", "claude-sonnet-4-5-20250929", "claude-opus-4-7"],
      {
        "claude-3-5-haiku-20241022": {
          status: "failed",
          probes: { structured: false },
        },
        "claude-sonnet-4-5-20250929": {
          status: "healthy",
          probes: { structured: true },
        },
        "claude-opus-4-7": {
          status: "healthy",
          probes: { structured: true },
          cooldownUntil: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    );

    expect(result).toEqual(["claude-sonnet-4-5-20250929"]);
  });
});

describe("resolveJdExtractionCustomerModel", () => {
  it("prefers fast verified utility model over Opus enhance model", () => {
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

describe("resolveJdExtractionCustomerRoute", () => {
  it("prefers verified Sonnet when Haiku is not on the key", () => {
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
      "claude-opus-4-5-20251101",
      "claude-opus-4-7",
    ]);
  });

  it("uses structured probe list when provided", () => {
    const route = resolveJdExtractionCustomerRoute(
      {
        mode: "customer",
        provider: "anthropic",
        vaultKeyId: "vault-1",
        modelId: "claude-opus-4-5-20251101",
        modelCandidates: ["claude-opus-4-5-20251101", "claude-sonnet-4-5-20250929"],
      },
      GEMINI_JD_EXTRACT_MODEL,
      {
        structuredCandidates: ["claude-3-5-haiku-20241022", "claude-sonnet-4-5-20250929"],
        fallbackCandidates: ["claude-opus-4-5-20251101", "claude-sonnet-4-5-20250929"],
      },
    );

    expect(route.modelId).toBe("claude-3-5-haiku-20241022");
    expect(route.modelCandidates[0]).toBe("claude-3-5-haiku-20241022");
    expect(route.modelCandidates).toContain("claude-opus-4-5-20251101");
  });

  it("does not retry unprobed utility models when structured probe list is empty", () => {
    const route = resolveJdExtractionCustomerRoute(
      {
        mode: "customer",
        provider: "anthropic",
        vaultKeyId: "vault-1",
        modelId: "claude-opus-4-5-20251101",
        modelCandidates: [
          "claude-opus-4-5-20251101",
          "claude-sonnet-4-5-20250929",
        ],
      },
      GEMINI_JD_EXTRACT_MODEL,
      {
        structuredCandidates: [],
        structuredProbeApplied: true,
        fallbackCandidates: [
          "claude-opus-4-5-20251101",
          "claude-sonnet-4-5-20250929",
        ],
      },
    );

    expect(route.modelId).toBe("claude-opus-4-5-20251101");
    expect(route.modelCandidates).not.toContain("claude-sonnet-4-5-20250929");
  });
});
