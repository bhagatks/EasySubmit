export const EXTENSION_MESSAGE = {
  AUTH_TOKEN: "EASYSUBMIT_AUTH_TOKEN",
  GET_AUTH: "EASYSUBMIT_GET_AUTH",
  OPEN_LOGIN: "EASYSUBMIT_OPEN_LOGIN",
  SAVE_JOB: "EASYSUBMIT_SAVE_JOB",
  RUN_PIPELINE: "EASYSUBMIT_RUN_PIPELINE",
  START_APPLY: "EASYSUBMIT_START_APPLY",
  JOB_STATUS: "EASYSUBMIT_JOB_STATUS",
  GET_CONFIG: "EASYSUBMIT_GET_CONFIG",
  GET_RESUME_PROFILES: "EASYSUBMIT_GET_RESUME_PROFILES",
  FORCE_SHOW_CARD: "EASYSUBMIT_FORCE_SHOW_CARD",
  OPEN_DASHBOARD: "EASYSUBMIT_OPEN_DASHBOARD",
  COMPLETE_AUTOFILL: "EASYSUBMIT_COMPLETE_AUTOFILL",
  GET_FILL_DATA: "EASYSUBMIT_GET_FILL_DATA",
  CAPTURE_APPLICATION_ANSWERS: "EASYSUBMIT_CAPTURE_APPLICATION_ANSWERS",
  UPDATE_USER_PREFS: "EASYSUBMIT_UPDATE_USER_PREFS",
  PING: "EASYSUBMIT_PING",
} as const;

export const STORAGE_KEYS = {
  authToken: "easysubmit_auth_token_v1",
  apiBaseUrl: "easysubmit_api_base_url_v1",
  cardPosition: "easysubmit_card_position_v1",
  cardCollapsed: "easysubmit_card_collapsed_v1",
  selectedProfileId: "easysubmit_selected_profile_id_v1",
  extensionId: "easysubmit_extension_id_v1",
  pendingApplyJobId: "easysubmit_pending_apply_job_id_v1",
} as const;

export const DEFAULT_API_BASE = "http://localhost:3000";
