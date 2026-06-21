import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import type { ApiCallAiMode, ApiCallKeySource } from "@/src/shared/observability/types";

export type RouteLogContext = {
  aiMode: ApiCallAiMode | null;
  provider: string | null;
  modelId: string | null;
  keySlot: number | null;
  keySource: ApiCallKeySource | null;
};

/** Map resolved AI route to safe fields for api_call_logs (never includes secrets). */
export function routeContextForApiLog(
  route: ResolvedAiRoute | { error: string },
): RouteLogContext {
  if ("error" in route) {
    return {
      aiMode: null,
      provider: null,
      modelId: null,
      keySlot: null,
      keySource: null,
    };
  }

  if (route.mode === "system") {
    return {
      aiMode: "system",
      provider: "gemini",
      modelId: route.modelId,
      keySlot: null,
      keySource: null,
    };
  }

  return {
    aiMode: "customer",
    provider: route.provider,
    modelId: route.modelId,
    keySlot: null,
    keySource: "vault",
  };
}
