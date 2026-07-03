import { buildApplyPipelineStepProperties } from "@/src/shared/analytics/apply-pipeline-step";
import { getAnalyticsConfig, isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";
import { AnalyticsEvents } from "@/src/shared/analytics/events";
import type { ApplyPipelineStepAnalyticsInput } from "@/src/shared/analytics/apply-pipeline-step";

export type ApplyPipelineStepPostHogInput = ApplyPipelineStepAnalyticsInput & {
  userId: string;
};

/** Fire-and-forget — one PostHog row per Apply pipeline step status change. */
export function captureApplyPipelineStep(input: ApplyPipelineStepPostHogInput): void {
  if (!isDevAnalyticsEnvironment()) return;
  const config = getAnalyticsConfig();
  if (!config.enabled || !config.key) return;

  const distinctId = input.userId.trim() || input.traceId?.trim() || "server-anonymous";
  const properties = buildApplyPipelineStepProperties(input);

  void fetch(`${config.host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.key,
      event: AnalyticsEvents.EXTENSION_APPLY_PIPELINE_STEP,
      distinct_id: distinctId,
      properties: {
        environment: config.environment,
        ...properties,
      },
    }),
  }).catch(() => {
    /* analytics must not block pipeline */
  });
}

export function captureApplyPipelineStarted(input: {
  userId: string;
  entryId: string;
  traceId: string;
}): void {
  if (!isDevAnalyticsEnvironment()) return;
  const config = getAnalyticsConfig();
  if (!config.enabled || !config.key) return;

  const distinctId = input.userId.trim() || input.traceId.trim();

  void fetch(`${config.host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.key,
      event: AnalyticsEvents.EXTENSION_APPLY_PIPELINE_STARTED,
      distinct_id: distinctId,
      properties: {
        environment: config.environment,
        surface: "extension",
        entry_id: input.entryId,
        trace_id: input.traceId,
      },
    }),
  }).catch(() => {
    /* analytics must not block pipeline */
  });
}
