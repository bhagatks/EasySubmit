import type { FeatureSurface, ResumeRulesV2FeatureResolution } from "@/lib/features/types";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import {
  resolveResumeRulesV2ForPageMode,
  type ResumeRulesV2Resolution,
} from "@/lib/resume/v2/runtime";

export type { ResumePageModeV2 } from "@/lib/resume/v2/page-mode";

export { resolveResumeRulesV2ForPageMode, type ResumeRulesV2Resolution };

export async function resolveResumeRulesV2Feature(
  _user: { id: string },
  _surface: FeatureSurface,
  pageLengthPreference?: unknown,
): Promise<ResumeRulesV2FeatureResolution> {
  const flags = await getFeatureFlags();
  return resolveResumeRulesV2ForPageMode(pageLengthPreference, flags.resumeRulesV2);
}

export function isResumeRulesV2Active(
  resolution: Pick<ResumeRulesV2FeatureResolution, "enabled">,
): boolean {
  return resolution.enabled;
}
