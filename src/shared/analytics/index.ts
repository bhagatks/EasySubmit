export {
  AnalyticsEvents,
  type AnalyticsEventName,
  type EnhanceAnalyticsSurface,
  type EnhanceDocumentKind,
  type WorkbenchPhaseCode,
} from "@/src/shared/analytics/events";

export { sanitizeProperties } from "@/src/shared/analytics/sanitize";
export { getAnalyticsConfig, type AnalyticsConfig, type AnalyticsEnvironment } from "@/src/shared/analytics/config";

export {
  captureAnalyticsEvent,
  captureAnalyticsPageView,
  captureAnalyticsException,
  identifyAnalyticsUser,
  resetAnalyticsUser,
  initAnalyticsGlobalErrorHandlers,
  isInternalAnalyticsTraffic,
} from "@/src/shared/analytics/browser";
