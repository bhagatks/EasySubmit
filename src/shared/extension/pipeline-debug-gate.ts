import { isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";

/**
 * Dev-only Apply pipeline QA overlay + DB step progress.
 * Independent from PostHog step analytics (see apply-pipeline-step-analytics).
 */
export function isPipelineDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return isDevAnalyticsEnvironment();
}
