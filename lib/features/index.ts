import { prisma } from "@/lib/prisma";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import { resolveJdExtractFeature } from "@/lib/features/resolve-jd-extract";
import { resolveResumeRulesV2Feature } from "@/lib/features/resolve-resume-rules-v2";
import { resolveSubscriptionFeature } from "@/lib/features/resolve-subscription";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import type {
  FeatureName,
  FeatureResolutionMap,
  FeatureSurface,
} from "@/lib/features/types";

export type { FeatureName, FeatureSurface } from "@/lib/features/types";
export type { EnhanceFeatureResolution, SubscriptionFeatureResolution, ResumeRulesV2FeatureResolution, JdExtractFeatureResolution } from "@/lib/features/types";
export { enhanceFeatureRoute } from "@/lib/features/enhance-ai-route";

type ResolveFeatureInput<F extends FeatureName> = {
  feature: F;
  userId: string;
  surface: FeatureSurface;
  /** Used by resumeRulesV2 — form page length / page mode selection. */
  pageLengthPreference?: unknown;
};

export async function resolveFeature<F extends FeatureName>(
  input: ResolveFeatureInput<F>,
): Promise<FeatureResolutionMap[F]> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: SYSTEM_QUOTA_USER_SELECT,
  });

  if (!user) {
    throw new Error(`resolveFeature: user ${input.userId} not found`);
  }

  switch (input.feature) {
    case "enhance":
      return resolveEnhanceFeature(user, input.surface) as Promise<FeatureResolutionMap[F]>;
    case "subscription":
      return resolveSubscriptionFeature(user, input.surface) as Promise<FeatureResolutionMap[F]>;
    case "resumeRulesV2":
      return resolveResumeRulesV2Feature(
        user,
        input.surface,
        input.pageLengthPreference,
      ) as Promise<FeatureResolutionMap[F]>;
    case "jdExtract": {
      const flags = await getFeatureFlags();
      return resolveJdExtractFeature(flags) as FeatureResolutionMap[F];
    }
    default:
      throw new Error(`resolveFeature: unknown feature "${input.feature}"`);
  }
}
