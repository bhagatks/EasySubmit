/**
 * Ordered pipeline step ids for Enhance with AI.
 * Every log line should include `step` so terminal/browser traces are scannable.
 */
export const ENHANCE_PIPELINE = {
  /** Client: user submitted dialog / hook invoked. */
  CLIENT_SUBMIT: "01_client_submit",
  /** Client: loaded timeout + controls from app_config. */
  CLIENT_CONFIG: "02_client_config",
  /** Client: server action dispatched (Promise.race started). */
  CLIENT_DISPATCH: "03_client_dispatch",
  /** Client: server action resolved successfully. */
  CLIENT_RESPONSE_OK: "04_client_response_ok",
  /** Client: server action returned structured failure. */
  CLIENT_RESPONSE_FAIL: "04_client_response_fail",
  /** Client: client-side timeout fired before action finished. */
  CLIENT_TIMEOUT: "04_client_timeout",
  /** Client: unexpected throw (network, serialization, etc.). */
  CLIENT_THROW: "04_client_throw",
  /** Client: merge enhanced form into editor state. */
  CLIENT_APPLY: "05_client_apply",
  /** Client: error alert shown to user. */
  CLIENT_ERROR_ALERT: "04_client_error_alert",

  /** Server: enhanceResumeProfile entry. */
  SERVER_ACTION_START: "10_server_action_start",
  /** Server: session + user row loaded. */
  SERVER_AUTH: "11_server_auth",
  /** Server: quota pre-check. */
  SERVER_QUOTA: "12_server_quota",
  /** Server: AI route resolved (BYOK vs system). */
  SERVER_ROUTE: "13_server_route",
  /** Server: runResumeEnhance invoked. */
  SERVER_ENGINE: "14_server_engine",

  /** Engine: runResumeEnhance entry. */
  ENGINE_RUN_START: "20_engine_run_start",
  /** Engine: pass 1 (generate) model call. */
  ENGINE_PASS_GENERATE: "21_engine_pass_generate",
  /** Engine: pass 2 (optimize) model call — job description only. */
  ENGINE_PASS_OPTIMIZE: "22_engine_pass_optimize",
  /** Engine: parse + merge + diff. */
  ENGINE_MERGE: "23_engine_merge",
  /** Engine: unhandled provider/runtime error. */
  ENGINE_ERROR: "24_engine_error",

  /** Server: quota increment + usage log. */
  SERVER_PERSIST: "30_server_persist",
  /** Server: success response returned to client. */
  SERVER_SUCCESS: "31_server_success",
  /** Server: structured failure returned to client. */
  SERVER_FAIL: "31_server_fail",

  /** Server: ATS job intelligence computed. */
  SERVER_JD_INTELLIGENCE: "15_server_jd_intelligence",
  /** Server: JD Brain directive built. */
  SERVER_JD_DIRECTIVE: "16_server_jd_directive",

  /** Engine: deterministic fallback enhancer ran. */
  ENGINE_DETERMINISTIC: "25_engine_deterministic",
} as const;

export type EnhancePipelineStep =
  (typeof ENHANCE_PIPELINE)[keyof typeof ENHANCE_PIPELINE];

/** Human-readable hint for operators reading `[EnhanceAI]` logs. */
export const ENHANCE_PIPELINE_HINTS: Record<EnhancePipelineStep, string> = {
  [ENHANCE_PIPELINE.CLIENT_SUBMIT]: "User submitted Enhance with AI",
  [ENHANCE_PIPELINE.CLIENT_CONFIG]: "Client loaded enhance timeout from app_config",
  [ENHANCE_PIPELINE.CLIENT_DISPATCH]: "Client dispatched enhanceResumeProfile",
  [ENHANCE_PIPELINE.CLIENT_RESPONSE_OK]: "Client received success from server action",
  [ENHANCE_PIPELINE.CLIENT_RESPONSE_FAIL]: "Client received failure payload from server",
  [ENHANCE_PIPELINE.CLIENT_TIMEOUT]: "Client timeout — server may still be running",
  [ENHANCE_PIPELINE.CLIENT_THROW]: "Client unexpected error during enhance",
  [ENHANCE_PIPELINE.CLIENT_APPLY]: "Client applying enhanced form to editor",
  [ENHANCE_PIPELINE.CLIENT_ERROR_ALERT]: "Error alert shown — check traceId in server terminal",

  [ENHANCE_PIPELINE.SERVER_ACTION_START]: "Server action started",
  [ENHANCE_PIPELINE.SERVER_AUTH]: "Session verified, user loaded",
  [ENHANCE_PIPELINE.SERVER_QUOTA]: "Quota checked",
  [ENHANCE_PIPELINE.SERVER_ROUTE]: "AI route resolved",
  [ENHANCE_PIPELINE.SERVER_ENGINE]: "Calling runResumeEnhance",

  [ENHANCE_PIPELINE.ENGINE_RUN_START]: "Engine run started",
  [ENHANCE_PIPELINE.ENGINE_PASS_GENERATE]: "Engine pass 1 — generate",
  [ENHANCE_PIPELINE.ENGINE_PASS_OPTIMIZE]: "Engine pass 2 — optimize for JD",
  [ENHANCE_PIPELINE.ENGINE_MERGE]: "Engine merge + diff sections",
  [ENHANCE_PIPELINE.ENGINE_ERROR]: "Engine caught provider/runtime error",

  [ENHANCE_PIPELINE.SERVER_PERSIST]: "Quota increment + usage log",
  [ENHANCE_PIPELINE.SERVER_SUCCESS]: "Server returning success to client",
  [ENHANCE_PIPELINE.SERVER_FAIL]: "Server returning failure to client",
  [ENHANCE_PIPELINE.SERVER_JD_INTELLIGENCE]: "ATS intelligence computed from JD",
  [ENHANCE_PIPELINE.SERVER_JD_DIRECTIVE]: "JD Brain directive built for pass 2",
  [ENHANCE_PIPELINE.ENGINE_DETERMINISTIC]: "Deterministic fallback — no AI rewrite",
};

/** Extension apply + tailor pipeline steps (40–51). */
export const TAILOR_PIPELINE = {
  APPLY_START: "40_apply_start",
  APPLY_SKIP_CUSTOMIZE: "41_apply_skip_customize",
  APPLY_TAILOR_DISPATCH: "42_apply_tailor_dispatch",
  APPLY_TAILOR_RESULT: "43_apply_tailor_result",

  TAILOR_START: "44_tailor_start",
  TAILOR_JD_CHECK: "45_tailor_jd_check",
  TAILOR_SOURCE_PROFILE: "46_tailor_source_profile",
  TAILOR_ENHANCE_DISPATCH: "47_tailor_enhance_dispatch",
  TAILOR_ENHANCE_RESULT: "48_tailor_enhance_result",
  TAILOR_OVERRIDES: "49_tailor_overrides",
  TAILOR_PERSIST: "50_tailor_persist",
  TAILOR_SUCCESS: "51_tailor_success",
  TAILOR_FAIL: "51_tailor_fail",
} as const;

export type TailorPipelineStep = (typeof TAILOR_PIPELINE)[keyof typeof TAILOR_PIPELINE];

export const TAILOR_PIPELINE_HINTS: Record<TailorPipelineStep, string> = {
  [TAILOR_PIPELINE.APPLY_START]: "Apply pipeline — job capture started",
  [TAILOR_PIPELINE.APPLY_SKIP_CUSTOMIZE]: "Customize resume off — skipping tailor",
  [TAILOR_PIPELINE.APPLY_TAILOR_DISPATCH]: "Apply pipeline — dispatching tailor",
  [TAILOR_PIPELINE.APPLY_TAILOR_RESULT]: "Apply pipeline — tailor finished",

  [TAILOR_PIPELINE.TAILOR_START]: "Pipeline tailor started",
  [TAILOR_PIPELINE.TAILOR_JD_CHECK]: "Checking job description length",
  [TAILOR_PIPELINE.TAILOR_SOURCE_PROFILE]: "Resolved source resume profile",
  [TAILOR_PIPELINE.TAILOR_ENHANCE_DISPATCH]: "Calling enhanceResumeForUserId",
  [TAILOR_PIPELINE.TAILOR_ENHANCE_RESULT]: "Enhance returned — inspect delta + fallbackUsed",
  [TAILOR_PIPELINE.TAILOR_OVERRIDES]: "Extracted section overrides for job row",
  [TAILOR_PIPELINE.TAILOR_PERSIST]: "Persisting jobResumeTailor row",
  [TAILOR_PIPELINE.TAILOR_SUCCESS]: "Pipeline tailor succeeded",
  [TAILOR_PIPELINE.TAILOR_FAIL]: "Pipeline tailor failed",
};

/** PDF/DOCX export resolution steps (60–62). */
export const EXPORT_PIPELINE = {
  RESOLVE_START: "60_export_resolve_start",
  RESOLVE_FORM: "61_export_form_resolved",
  CONTENT_BUILD: "62_export_content_built",
} as const;

export type ExportPipelineStep = (typeof EXPORT_PIPELINE)[keyof typeof EXPORT_PIPELINE];

export const EXPORT_PIPELINE_HINTS: Record<ExportPipelineStep, string> = {
  [EXPORT_PIPELINE.RESOLVE_START]: "Export — resolving resume form for job",
  [EXPORT_PIPELINE.RESOLVE_FORM]: "Export — form source (tailored vs default profile)",
  [EXPORT_PIPELINE.CONTENT_BUILD]: "Export — content model built (bullet caps applied)",
};

export type PipelineLogStep =
  | EnhancePipelineStep
  | TailorPipelineStep
  | ExportPipelineStep;

const ALL_PIPELINE_HINTS: Record<string, string> = {
  ...ENHANCE_PIPELINE_HINTS,
  ...TAILOR_PIPELINE_HINTS,
  ...EXPORT_PIPELINE_HINTS,
};

export function pipelineStepHint(step: string | undefined): string | undefined {
  if (!step) return undefined;
  return ALL_PIPELINE_HINTS[step];
}
