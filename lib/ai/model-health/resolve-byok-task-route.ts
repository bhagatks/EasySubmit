import {
  buildDefaultModelCandidatesForTask,
  loadProviderModelHealth,
  resolveCandidatesFromHealthForTask,
} from "@/lib/ai/model-health/resolve-model-candidates";
import type { ByokTaskTier } from "@/lib/ai/model-health/types";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";

export type CustomerAiRoute = Extract<ResolvedAiRoute, { mode: "customer" }>;

export function taskTierFromEnhancePass(
  pass: "generate" | "optimize",
  override?: ByokTaskTier,
): ByokTaskTier {
  if (override) return override;
  return pass === "optimize" ? "flagship" : "cheap";
}

/** BYOK-only route resolver — picks tier-appropriate model candidates without touching system pool. */
export async function resolveByokTaskRoute(
  route: CustomerAiRoute,
  taskTier: ByokTaskTier,
  input?: { userId?: string | null; preferredModelId?: string | null },
): Promise<CustomerAiRoute> {
  const preferredModelId = input?.preferredModelId ?? route.modelId;

  if (input?.userId) {
    const health = await loadProviderModelHealth(input.userId, route.provider);
    if (health && health.rankedModels.length > 0) {
      const resolved = resolveCandidatesFromHealthForTask(
        route.provider,
        health,
        taskTier,
        preferredModelId,
      );
      return {
        ...route,
        modelId: resolved.primaryModelId,
        modelCandidates: resolved.rankedModels,
      };
    }
  }

  const defaults = buildDefaultModelCandidatesForTask(
    route.provider,
    taskTier,
    preferredModelId,
  );
  return {
    ...route,
    modelId: defaults.primaryModelId,
    modelCandidates: defaults.rankedModels,
  };
}

export async function resolveRouteForByokTask(
  route: ResolvedAiRoute,
  taskTier: ByokTaskTier,
  input?: { userId?: string | null; preferredModelId?: string | null },
): Promise<ResolvedAiRoute> {
  if (route.mode !== "customer") return route;
  return resolveByokTaskRoute(route, taskTier, input);
}
