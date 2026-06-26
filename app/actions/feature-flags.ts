"use server";

import { getFeatureFlags, isEnhanceOnboardingVisible, type FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";

/** Client-safe fetch of global feature flags. */
export async function fetchFeatureFlags(): Promise<FeatureFlagsSnapshot> {
  return getFeatureFlags();
}

/** Onboarding Enhance entry: `enhance_with_ai_onboarding` flag AND `system_ai_enabled`. */
export async function fetchEnhanceOnboardingAvailable(): Promise<boolean> {
  const flags = await getFeatureFlags();
  return isEnhanceOnboardingVisible(flags);
}
