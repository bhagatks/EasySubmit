"use server";

import { getFeatureFlags, type FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";

/** Client-safe fetch of global feature flags. */
export async function fetchFeatureFlags(): Promise<FeatureFlagsSnapshot> {
  return getFeatureFlags();
}
