"use server";

import { getAppConfig } from "@/src/lib/services/config-service";
import { isSystemAiEnabled } from "@/src/lib/services/ai-engine-config";
import {
  getFeatureFlags,
  isEnhanceOnboardingVisible,
  type FeatureFlagsSnapshot,
} from "@/src/lib/services/feature-flags-service";

/** Client-safe fetch of global feature flags. */
export async function fetchFeatureFlags(): Promise<FeatureFlagsSnapshot> {
  return getFeatureFlags();
}

/** Onboarding Enhance entry: `enhance_with_ai_onboarding` flag AND `aiEngine.quotas.system.enable`. */
export async function fetchEnhanceOnboardingAvailable(): Promise<boolean> {
  const [flags, aiEngine] = await Promise.all([
    getFeatureFlags(),
    getAppConfig("aiEngine"),
  ]);
  return isEnhanceOnboardingVisible(flags, isSystemAiEnabled(aiEngine));
}
