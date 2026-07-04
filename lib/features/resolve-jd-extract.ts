import type { FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";

export type JdExtractFeatureResolution = {
  /** When true, run AI JD extract (generateObject). When false, deterministic + vocab only. */
  shouldRunAiExtract: boolean;
};

export function resolveJdExtractFeature(
  flags: FeatureFlagsSnapshot,
): JdExtractFeatureResolution {
  return { shouldRunAiExtract: flags.aiJdExtractEnabled };
}
