import { isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";

/**
 * Dev-only Apply pipeline QA overlay + step progress.
 * Active when NEXT_PUBLIC_ANALYTICS_ENV !== "prod" (local dev + dev extension build).
 * Never active on production deploys or Chrome Web Store extension builds.
 */
export function isPipelineDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return isDevAnalyticsEnvironment();
}
