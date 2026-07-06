import {
  AI_PRICING_MAP_DEFAULT,
  resolveModelPricing,
  type AiPricingMap,
} from "@/src/lib/services/ai-pricing-map";
import type { ModelTier } from "@/lib/ai/model-health/types";

export type { ModelTier };

/** USD per 1M input tokens — at or below this → cheap when pricing is known. */
export const CHEAP_TIER_INPUT_COST_PER_1M = 2;

const FLAGSHIP_FORCE_PATTERN =
  /reasoner|o1(-|$)|o3(-|$)|opus|thinking|claude-opus|claude-3-opus|preview.*pro/i;

const CHEAP_HEURISTIC_PATTERN =
  /flash-lite|flash(?!.*pro)|mini|haiku|8b-instant|instant|deepseek-v4-flash|deepseek-chat(?!.*reasoner)|lite|turbo(?!.*pro)|qwen.*32b|llama-3\.[18]b|mixtral-8x7b|glm-4-flash/i;

export function inputCostPer1M(
  modelId: string,
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): number {
  return resolveModelPricing(modelId, pricingMap).inputPer1k * 1000;
}

export function classifyModelTier(
  modelId: string,
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): ModelTier {
  const lower = modelId.trim().toLowerCase();
  if (!lower) return "flagship";

  if (FLAGSHIP_FORCE_PATTERN.test(lower) || lower.includes("deepseek-reasoner")) {
    return "flagship";
  }

  if (CHEAP_HEURISTIC_PATTERN.test(lower)) {
    return "cheap";
  }

  const exactRates = pricingMap.models[lower];
  if (exactRates && exactRates.inputPer1k * 1000 <= CHEAP_TIER_INPUT_COST_PER_1M) {
    return "cheap";
  }

  return "flagship";
}

/** Primary fuel for ignition — prefer best flagship; fall back to cheapest discoverable model. */
export function suggestDiscoveredPrimaryFuel(
  modelIds: string[],
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): string {
  if (!modelIds.length) return "";

  const ranked = modelIds
    .map((id) => ({
      id,
      tier: classifyModelTier(id, pricingMap),
      cost: inputCostPer1M(id, pricingMap),
    }))
    .sort((left, right) => {
      if (left.tier !== right.tier) {
        return left.tier === "flagship" ? -1 : 1;
      }
      if (left.tier === "flagship") {
        return right.cost - left.cost;
      }
      return left.cost - right.cost;
    });

  return ranked[0]?.id ?? modelIds[0]!;
}
