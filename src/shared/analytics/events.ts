/** PostHog product analytics event names — Option A catalog. */

export const AnalyticsEvents = {
  LOGIN_STARTED: "login_started",
  LOGIN_COMPLETED: "login_completed",

  ONBOARDING_PHASE_VIEWED: "onboarding_phase_viewed",
  ONBOARDING_PHASE_COMPLETED: "onboarding_phase_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_ENHANCE_COMPLETED: "onboarding_enhance_completed",

  REVIEW_SCREEN_OPENED: "review_screen_opened",
  REVIEW_TAB_CHANGED: "review_tab_changed",

  ENHANCE_CLICKED: "enhance_clicked",
  ENHANCE_COMPLETED: "enhance_completed",
  /** Mirrors each row written to `api_call_logs` (server-side). */
  API_CALL_LOGGED: "api_call_logged",
  /** Dev project only — granular resume journey steps (ai_used, ai_call_status). */
  RESUME_JOURNEY_STEP: "resume_journey_step",
  /** Explicit UI click / control activation (extension + web helpers). */
  UI_INTERACTION: "ui_interaction",

  EXTENSION_CARD_OPENED: "extension_card_opened",
  EXTENSION_CARD_COLLAPSED: "extension_card_collapsed",
  EXTENSION_POPUP_OPENED: "extension_popup_opened",
  EXTENSION_POPUP_SHOW_CARD: "extension_popup_show_card",
  EXTENSION_JOB_CAPTURED: "extension_job_captured",
  EXTENSION_APPLY_STARTED: "extension_apply_started",
  EXTENSION_AUTOFILL_STARTED: "extension_autofill_started",
  EXTENSION_AUTOFILL_COMPLETED: "extension_autofill_completed",

  BYOK_CTA_CLICKED: "byok_cta_clicked",
  BYOK_HANDSHAKE_STARTED: "byok_handshake_started",
  BYOK_HANDSHAKE_SUCCEEDED: "byok_handshake_succeeded",
  BYOK_HANDSHAKE_FAILED: "byok_handshake_failed",
  BYOK_KEY_SAVED: "byok_key_saved",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type EnhanceAnalyticsSurface =
  | "review_resume"
  | "review_cover"
  | "onboarding_studio"
  | "dashboard_studio"
  | "job_studio"
  | "extension";

export type EnhanceDocumentKind = "resume" | "cover_letter";

export type WorkbenchPhaseCode = "IDENTITY" | "IMPORT" | "STUDIO";
