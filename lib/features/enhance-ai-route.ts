import type { EnhanceFeatureResolution } from "@/lib/features/types";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";

/** Resolved AI route from the enhance feature — null when AI is unavailable. */
export function enhanceFeatureRoute(
  resolution: EnhanceFeatureResolution,
): ResolvedAiRoute | null {
  return resolution.route;
}

export function isResolvedAiRoute(
  value: ResolvedAiRoute | { error: string } | null | undefined,
): value is ResolvedAiRoute {
  return Boolean(value && !("error" in value));
}
