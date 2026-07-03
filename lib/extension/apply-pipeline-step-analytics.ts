import {
  FEATURE_FLAG_KEYS,
  isFeatureEnabled,
} from "@/src/lib/services/feature-flags-service";

/** Server-side gate — same `feature_flags` row in dev and prod. */
export async function isApplyPipelineStepAnalyticsEnabled(): Promise<boolean> {
  if (process.env.NODE_ENV === "test") return false;
  return isFeatureEnabled(FEATURE_FLAG_KEYS.extensionApplyPipelineStepAnalytics);
}
