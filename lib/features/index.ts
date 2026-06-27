import { prisma } from "@/lib/prisma";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import { resolveSubscriptionFeature } from "@/lib/features/resolve-subscription";
import type {
  FeatureName,
  FeatureResolutionMap,
  FeatureSurface,
} from "@/lib/features/types";

export type { FeatureName, FeatureSurface } from "@/lib/features/types";
export type { EnhanceFeatureResolution, SubscriptionFeatureResolution } from "@/lib/features/types";
export { enhanceFeatureRoute } from "@/lib/features/enhance-ai-route";

type ResolveFeatureInput<F extends FeatureName> = {
  feature: F;
  userId: string;
  surface: FeatureSurface;
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
    default:
      throw new Error(`resolveFeature: unknown feature "${input.feature}"`);
  }
}
