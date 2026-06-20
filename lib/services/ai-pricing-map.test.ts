import { describe, expect, it } from "vitest";
import {
  AI_PRICING_MAP_DEFAULT,
  parseAiPricingMap,
  resolveModelPricing,
} from "@/src/lib/services/ai-pricing-map";
import {
  estimateUsageCostFromTotalTokens,
  estimateUsageCostUsd,
} from "@/src/lib/ai/estimate-usage-cost";

describe("ai-pricing-map", () => {
  it("parses ai_pricing_map from app_config JSON", () => {
    const map = parseAiPricingMap({
      default: { inputPer1k: 0.001, outputPer1k: 0.002 },
      models: { "gpt-4o": { inputPer1k: 0.01, outputPer1k: 0.02 } },
      patterns: [{ match: "claude", inputPer1k: 0.003, outputPer1k: 0.015 }],
    });

    expect(map?.default.inputPer1k).toBe(0.001);
    expect(map?.models["gpt-4o"]?.outputPer1k).toBe(0.02);
    expect(map?.patterns[0]?.match).toBe("claude");
  });

  it("resolves exact model rates before pattern fallbacks", () => {
    const rates = resolveModelPricing("gpt-4o", AI_PRICING_MAP_DEFAULT);
    expect(rates.inputPer1k).toBe(0.0025);
  });

  it("calculates spend using a custom pricing map", () => {
    const customMap = parseAiPricingMap({
      default: { inputPer1k: 0.001, outputPer1k: 0.001 },
      models: {},
      patterns: [],
    })!;

    const cost = estimateUsageCostUsd(
      { modelId: "any-model", inputTokens: 1000, outputTokens: 1000 },
      customMap,
    );

    expect(cost).toBe(0.002);
  });

  it("estimates dashboard spend from total tokens", () => {
    const spend = estimateUsageCostFromTotalTokens("gpt-4o-mini", 1500);
    expect(spend).toBeGreaterThan(0);
  });
});
