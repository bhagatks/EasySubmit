import type { FeatureSurface, SubscriptionFeatureResolution } from "@/lib/features/types";
import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";
import type { SubscriptionPlanId } from "@/src/lib/services/subscription-config";

type UserSubscriptionRow = {
  plan: string | null;
  subscriptionStatus: string | null;
};

/** Surfaces where an upgrade nudge makes sense. */
const UPGRADE_NUDGE_SURFACES: FeatureSurface[] = ["onboarding", "job_apply", "resume"];

export async function resolveSubscriptionFeature(
  user: UserSubscriptionRow,
  surface: FeatureSurface,
): Promise<SubscriptionFeatureResolution> {
  const plan = user.plan ?? "free";
  const status = user.subscriptionStatus ?? null;
  const subscribed = isSubscribed(plan, status);

  const subscriptionConfig = await getAppConfig("subscriptions");

  const paidPlan = plan as SubscriptionPlanId;
  const planConfig =
    plan !== "free" && subscriptionConfig.plans[paidPlan as keyof typeof subscriptionConfig.plans]
      ? subscriptionConfig.plans[paidPlan as keyof typeof subscriptionConfig.plans]
      : null;

  const dailyEnhancements = planConfig?.dailyEnhancements ?? 0;

  return {
    plan,
    status,
    isSubscribed: subscribed,
    showUpgradeNudge: !subscribed && UPGRADE_NUDGE_SURFACES.includes(surface),
    limits: {
      dailyEnhancements,
      unlimited: subscribed,
    },
    canUpgrade: subscriptionConfig.enabled && !subscribed,
  };
}
