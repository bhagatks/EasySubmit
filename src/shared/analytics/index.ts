export {
  AnalyticsEvents,
  type AnalyticsEventName,
  type EnhanceAnalyticsSurface,
  type EnhanceDocumentKind,
  type WorkbenchPhaseCode,
} from "@/src/shared/analytics/events";

export { sanitizeProperties } from "@/src/shared/analytics/sanitize";
export {
  getAnalyticsConfig,
  isDevAnalyticsEnvironment,
  isEnhanceJourneyDebugEnabled,
  type AnalyticsConfig,
  type AnalyticsEnvironment,
} from "@/src/shared/analytics/config";

export {
  captureAnalyticsEvent,
  captureDevAnalyticsEvent,
  captureAnalyticsPageView,
  captureAnalyticsException,
  identifyAnalyticsUser,
  resetAnalyticsUser,
  initAnalyticsGlobalErrorHandlers,
  isInternalAnalyticsTraffic,
} from "@/src/shared/analytics/browser";

export { captureDevJourneyStep, type DevJourneyCaptureInput } from "@/src/shared/analytics/server-dev-capture";
export { captureApiCallLogged, type ApiCallPostHogCaptureInput } from "@/src/shared/analytics/server-api-call-capture";

export {
  trackEnhanceClicked,
  trackEnhanceCompleted,
  trackResumeJourneyStep,
  trackUiInteraction,
  trackByokCtaClicked,
  trackByokHandshakeStarted,
  trackByokHandshakeSucceeded,
  trackByokHandshakeFailed,
  trackByokKeySaved,
  trackPricingCtaClicked,
  trackPlanSelected,
  trackTutorialPlayed,
  trackAtsScoreViewed,
  trackAtsGuidelinesSectionViewed,
  trackResumeExported,
  trackStudioTabChanged,
  trackSettingsSectionViewed,
  type PricingAnalyticsSurface,
} from "@/src/shared/analytics/product-events";

export { trackScreenOverlay, trackScreenView } from "@/src/shared/analytics/screen-events";
