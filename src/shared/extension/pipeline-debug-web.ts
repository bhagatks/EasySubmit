import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

/** Dev-only dashboard URL for live Apply pipeline QA (extension stays visible on job site). */
export function pipelineDebugDashboardHref(
  apiBaseUrl: string,
  entryId: string,
): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/dashboard/pipeline?entryId=${encodeURIComponent(entryId)}`;
}

export function isWebPipelineDebugAvailable(): boolean {
  return isPipelineDebugEnabled();
}
