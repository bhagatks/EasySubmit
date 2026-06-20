import {
  AI_PRICING_MAP_DEFAULT,
  resolveModelPricing,
  type AiPricingMap,
} from "@/src/lib/services/ai-pricing-map";

export type UsageCostInput = {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
};

/** USD estimate for BYOK usage — rates from `app_config.ai_pricing_map` when provided. */
export function estimateUsageCostUsd(
  { modelId, inputTokens, outputTokens }: UsageCostInput,
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): number {
  const rates = resolveModelPricing(modelId, pricingMap);

  const cost =
    (inputTokens / 1000) * rates.inputPer1k +
    (outputTokens / 1000) * rates.outputPer1k;

  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** When only total tokens are stored, split 60/40 input/output for spend estimates. */
export function estimateUsageCostFromTotalTokens(
  modelId: string,
  totalTokens: number,
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): number {
  const tokens = Math.max(0, Math.floor(totalTokens));
  const inputTokens = Math.round(tokens * 0.6);
  const outputTokens = tokens - inputTokens;

  return estimateUsageCostUsd({ modelId, inputTokens, outputTokens }, pricingMap);
}

export function sumTokenUsage(usage?: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === "number") return usage.totalTokens;
  return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
}

export type UsageLogPayload = {
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
};

export function buildUsageLogFromGeneration(
  modelId: string,
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
  pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): UsageLogPayload {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const tokensUsed = usage?.totalTokens ?? inputTokens + outputTokens;

  return {
    modelId,
    tokensUsed,
    estimatedCost: estimateUsageCostUsd(
      { modelId, inputTokens, outputTokens },
      pricingMap,
    ),
  };
}
