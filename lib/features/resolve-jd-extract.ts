import type { FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";
import type { JdExtractFeatureResolution } from "@/lib/features/types";

export type { JdExtractFeatureResolution };

export function resolveJdExtractFeature(
  flags: FeatureFlagsSnapshot,
): JdExtractFeatureResolution {
  return { shouldRunAiExtract: flags.aiJdExtractEnabled };
}
