/** Client-side gate — reads the same flag from `/api/extension/config`. */
export function isApplyPipelineStepAnalyticsEnabledClient(
  configFlag?: boolean | null,
): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return configFlag === true;
}
