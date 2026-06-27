import { getAnalyticsConfig } from "@/src/shared/analytics/config";
import { AnalyticsEvents } from "@/src/shared/analytics/events";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";
import type { ApiCallLogInput } from "@/src/shared/observability/types";

export type ApiCallPostHogCaptureInput = ApiCallLogInput & {
  apiLogId: string;
};

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/api[_-]?key|secret|token|password|authorization/i.test(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Fire-and-forget — mirrors each `api_call_logs` row into PostHog for correlation with journey events. */
export function captureApiCallLogged(input: ApiCallPostHogCaptureInput): void {
  const config = getAnalyticsConfig();
  if (!config.enabled || !config.key) return;

  const distinctId = input.userId?.trim() || input.traceId?.trim() || "server-anonymous";
  const properties = sanitizeProperties({
    environment: config.environment,
    api_log_id: input.apiLogId,
    trace_id: input.traceId ?? undefined,
    domain: input.domain,
    operation: input.operation,
    provider: input.provider ?? undefined,
    model_id: input.modelId ?? undefined,
    status: input.status,
    http_status: input.httpStatus ?? undefined,
    duration_ms: input.durationMs,
    tokens_used: input.tokensUsed ?? undefined,
    estimated_cost: input.estimatedCost ?? undefined,
    ai_mode: input.aiMode ?? undefined,
    key_slot: input.keySlot ?? undefined,
    key_label: input.keyLabel ?? undefined,
    key_source: input.keySource ?? undefined,
    billing_mode: input.billingMode ?? undefined,
    error_code: input.errorCode ?? undefined,
    metadata: sanitizeMetadata(input.metadata ?? undefined),
  });

  void fetch(`${config.host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.key,
      event: AnalyticsEvents.API_CALL_LOGGED,
      distinct_id: distinctId,
      properties,
    }),
  }).catch(() => {
    /* analytics must not block API logging */
  });
}
