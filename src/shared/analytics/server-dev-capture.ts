import { getAnalyticsConfig, isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";
import { sanitizeProperties } from "@/src/shared/analytics/sanitize";
import type { JourneyAiCallStatus } from "@/src/lib/ai/engine/enhance-logger";

export type DevJourneyCaptureInput = {
  userId?: string | null;
  traceId?: string | null;
  journey: string;
  pipelineStep?: string | null;
  surface?: string | null;
  aiUsed: boolean;
  aiCallStatus: JourneyAiCallStatus;
  engineMode?: "ai" | "deterministic" | null;
  errorCode?: string | null;
  status?: "success" | "error";
  requestPreviewChars?: number | null;
  responsePreviewChars?: number | null;
  apiCallCount?: number | null;
  tokensUsed?: number | null;
};

/** Fire-and-forget PostHog capture — dev analytics project only (never prod). */
export function captureDevJourneyStep(input: DevJourneyCaptureInput): void {
  if (!isDevAnalyticsEnvironment()) return;

  const config = getAnalyticsConfig();
  if (!config.enabled || !config.key) return;

  const distinctId = input.userId?.trim() || input.traceId?.trim() || "server-anonymous";
  const properties = sanitizeProperties({
    environment: config.environment,
    dev_journey: true,
    journey: input.journey,
    pipeline_step: input.pipelineStep ?? undefined,
    trace_id: input.traceId ?? undefined,
    surface: input.surface ?? undefined,
    ai_used: input.aiUsed,
    ai_call_status: input.aiCallStatus,
    engine_mode: input.engineMode ?? undefined,
    error_code: input.errorCode ?? undefined,
    step_status: input.status ?? undefined,
    request_preview_chars: input.requestPreviewChars ?? undefined,
    response_preview_chars: input.responsePreviewChars ?? undefined,
    api_call_count: input.apiCallCount ?? undefined,
    tokens_used: input.tokensUsed ?? undefined,
  });

  void fetch(`${config.host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.key,
      event: "resume_journey_step",
      distinct_id: distinctId,
      properties,
    }),
  }).catch(() => {
    /* dev-only — ignore network failures */
  });
}
