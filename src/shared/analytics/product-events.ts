import {
  AnalyticsEvents,
  type EnhanceAnalyticsSurface,
  type EnhanceDocumentKind,
} from "@/src/shared/analytics/events";
import {
  captureAnalyticsEvent,
  captureDevAnalyticsEvent,
} from "@/src/shared/analytics/browser";
import type { JourneyAiCallStatus } from "@/src/lib/ai/engine/enhance-logger";

export function trackEnhanceClicked(input: {
  surface: EnhanceAnalyticsSurface;
  documentKind: EnhanceDocumentKind;
  aiEnabled: boolean;
}): void {
  captureAnalyticsEvent(AnalyticsEvents.ENHANCE_CLICKED, {
    surface: input.surface,
    document_kind: input.documentKind,
    ai_enabled: input.aiEnabled,
  });
}

/** Dev-only granular journey step — inspect in PostHog dev project (488025), not prod. */
export function trackResumeJourneyStep(input: {
  journey: string;
  pipelineStep?: string | null;
  surface?: EnhanceAnalyticsSurface | "extension_pipeline" | string;
  traceId?: string | null;
  aiUsed: boolean;
  aiCallStatus: JourneyAiCallStatus;
  engineMode?: "ai" | "deterministic" | null;
  errorCode?: string | null;
  status?: "success" | "error";
  jobStatus?: string | null;
}): void {
  captureDevAnalyticsEvent(AnalyticsEvents.RESUME_JOURNEY_STEP, {
    journey: input.journey,
    pipeline_step: input.pipelineStep ?? undefined,
    surface: input.surface ?? undefined,
    trace_id: input.traceId ?? undefined,
    ai_used: input.aiUsed,
    ai_call_status: input.aiCallStatus,
    engine_mode: input.engineMode ?? undefined,
    error_code: input.errorCode ?? undefined,
    step_status: input.status ?? undefined,
    job_status: input.jobStatus ?? undefined,
  });
}

export function trackEnhanceCompleted(input: {
  surface: EnhanceAnalyticsSurface;
  documentKind: EnhanceDocumentKind;
  status: "success" | "error";
  traceId?: string | null;
  durationMs?: number;
  errorCode?: string | null;
  engineMode?: "ai" | "deterministic";
  aiAttempted?: boolean;
  aiSucceeded?: boolean;
  aiBlockCode?: string | null;
  coveragePercent?: number | null;
  gapsCount?: number | null;
}): void {
  captureAnalyticsEvent(AnalyticsEvents.ENHANCE_COMPLETED, {
    surface: input.surface,
    document_kind: input.documentKind,
    status: input.status,
    trace_id: input.traceId ?? undefined,
    duration_ms: input.durationMs,
    error_code: input.errorCode ?? undefined,
    engine_mode: input.engineMode,
    ai_attempted: input.aiAttempted,
    ai_succeeded: input.aiSucceeded,
    ai_block_code: input.aiBlockCode ?? undefined,
    coverage_percent: input.coveragePercent ?? undefined,
    gaps_count: input.gapsCount ?? undefined,
  });

  trackResumeJourneyStep({
    journey: "ai_upgrade",
    pipelineStep: "enhance_completed",
    surface: input.surface,
    traceId: input.traceId,
    aiUsed: Boolean(input.aiAttempted),
    aiCallStatus:
      input.aiSucceeded === true
        ? "success"
        : input.aiAttempted
          ? "failure"
          : input.aiBlockCode
            ? "blocked"
            : "skipped",
    engineMode: input.engineMode ?? null,
    errorCode: input.errorCode ?? input.aiBlockCode ?? null,
    status: input.status,
  });
}

export function trackUiInteraction(input: {
  surface: EnhanceAnalyticsSurface | "extension_pipeline" | "onboarding" | "dashboard" | string;
  action: string;
  target?: string | null;
  label?: string | null;
  traceId?: string | null;
  entryId?: string | null;
}): void {
  captureAnalyticsEvent(AnalyticsEvents.UI_INTERACTION, {
    surface: input.surface,
    action: input.action,
    target: input.target ?? undefined,
    label: input.label?.slice(0, 80) ?? undefined,
    trace_id: input.traceId ?? undefined,
    entry_id: input.entryId ?? undefined,
  });
}

export function trackByokCtaClicked(source: string): void {
  captureAnalyticsEvent(AnalyticsEvents.BYOK_CTA_CLICKED, { source });
}

export function trackByokHandshakeStarted(provider: string): void {
  captureAnalyticsEvent(AnalyticsEvents.BYOK_HANDSHAKE_STARTED, { provider });
}

export function trackByokHandshakeSucceeded(provider: string): void {
  captureAnalyticsEvent(AnalyticsEvents.BYOK_HANDSHAKE_SUCCEEDED, { provider });
}

export function trackByokHandshakeFailed(provider: string, errorCode?: string | null): void {
  captureAnalyticsEvent(AnalyticsEvents.BYOK_HANDSHAKE_FAILED, {
    provider,
    error_code: errorCode ?? undefined,
  });
}

export function trackByokKeySaved(provider: string, isFirstKey: boolean): void {
  captureAnalyticsEvent(AnalyticsEvents.BYOK_KEY_SAVED, {
    provider,
    is_first_key: isFirstKey,
  });
}
