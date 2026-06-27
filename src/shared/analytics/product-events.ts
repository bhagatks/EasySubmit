import type {
  EnhanceAnalyticsSurface,
  EnhanceDocumentKind,
} from "@/src/shared/analytics/events";
import { AnalyticsEvents, captureAnalyticsEvent } from "@/src/shared/analytics";

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

export function trackEnhanceCompleted(input: {
  surface: EnhanceAnalyticsSurface;
  documentKind: EnhanceDocumentKind;
  status: "success" | "error";
  traceId?: string | null;
  durationMs?: number;
  errorCode?: string | null;
}): void {
  captureAnalyticsEvent(AnalyticsEvents.ENHANCE_COMPLETED, {
    surface: input.surface,
    document_kind: input.documentKind,
    status: input.status,
    trace_id: input.traceId ?? undefined,
    duration_ms: input.durationMs,
    error_code: input.errorCode ?? undefined,
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
