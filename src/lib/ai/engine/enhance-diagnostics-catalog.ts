import type { EnhancePipelineStep } from "@/src/lib/ai/engine/enhance-pipeline";

/** JD analysis track vs resume mutation track vs shared gates. */
export type EnhanceDiagnosticTrack =
  | "client"
  | "gate"
  | "jd"
  | "resume"
  | "engine"
  | "persist"
  | "pipeline";

export type EnhanceDiagnosticPhase =
  | "start"
  | "done"
  | "skip"
  | "fail"
  | "block";

/** Design-doc step id (0–22) or AI gate (G1–G6). */
export type EnhanceDesignStepId =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "G1"
  | "G2"
  | "G3"
  | "G4"
  | "G5"
  | "G6";

export type EnhanceDiagnosticStepDef = {
  designStep: EnhanceDesignStepId;
  track: EnhanceDiagnosticTrack;
  name: string;
  pipelineStep: EnhancePipelineStep | string;
  failureCodes?: string[];
};

/**
 * Canonical map from design reference (enhance-pipeline-design.md) to runtime logs.
 * Search terminal: `[EnhanceDiag]` + `designStep:"8"` or `track:jd`.
 */
export const ENHANCE_DIAGNOSTIC_CATALOG: EnhanceDiagnosticStepDef[] = [
  { designStep: "0", track: "gate", name: "Preflight gate (dashboard UI)", pipelineStep: "10_server_action_start" },
  { designStep: "1", track: "resume", name: "Load resume form", pipelineStep: "46_tailor_source_profile" },
  { designStep: "2", track: "resume", name: "Validate input (role, JD length)", pipelineStep: "45_tailor_jd_check", failureCodes: ["provider_error", "invalid_title"] },
  { designStep: "3", track: "resume", name: "O*NET role vocabulary", pipelineStep: "71_pre_onet_fetch" },
  { designStep: "4", track: "jd", name: "Keyword gap analysis", pipelineStep: "73_pre_keyword_gap" },
  { designStep: "5", track: "jd", name: "fast-rake + wink-nlp POS filter", pipelineStep: "75_pre_jd_brain" },
  { designStep: "6", track: "resume", name: "Bullet quality analysis", pipelineStep: "72_pre_bullet_quality" },
  { designStep: "7", track: "resume", name: "ATS parse simulation", pipelineStep: "74_pre_ats_parse" },
  { designStep: "8", track: "jd", name: "JD Brain + cache + AI extract", pipelineStep: "75_pre_jd_brain", failureCodes: ["provider_error", "quota_exceeded"] },
  { designStep: "9", track: "resume", name: "Summary + skills rules validate", pipelineStep: "78_pre_brief_start" },
  { designStep: "10", track: "jd", name: "Build enhance directive", pipelineStep: "76_pre_jd_directive" },
  { designStep: "11", track: "gate", name: "AI gates G1–G6 (resolveFeature)", pipelineStep: "27a_ai_upgrade_blocked" },
  { designStep: "G1", track: "gate", name: "Global AI env kill switch", pipelineStep: "27a_ai_upgrade_blocked", failureCodes: ["globally_disabled"] },
  { designStep: "G2", track: "gate", name: "Surface feature flag", pipelineStep: "27a_ai_upgrade_blocked", failureCodes: ["feature_disabled", "user_disabled"] },
  { designStep: "G3", track: "gate", name: "User aiSourcePreference disabled", pipelineStep: "27a_ai_upgrade_blocked", failureCodes: ["user_disabled"] },
  { designStep: "G4", track: "gate", name: "systemAiEnabled routing mode", pipelineStep: "13_server_route" },
  { designStep: "G5", track: "gate", name: "Route resolution (BYOK / system pool)", pipelineStep: "13_server_route", failureCodes: ["no_key", "pool_down"] },
  { designStep: "G6", track: "gate", name: "Daily quota (customer non-subscribed)", pipelineStep: "12_server_quota", failureCodes: ["quota_exceeded"] },
  { designStep: "12", track: "resume", name: "ATS readiness BEFORE", pipelineStep: "80_post_ats_before" },
  { designStep: "13", track: "engine", name: "Enhance engine (AI or deterministic)", pipelineStep: "20_engine_run_start", failureCodes: ["provider_error", "parse_fail", "timeout"] },
  { designStep: "14", track: "resume", name: "Post-process rules enforcement", pipelineStep: "23_engine_merge" },
  { designStep: "15", track: "resume", name: "Diff changed sections", pipelineStep: "23_engine_merge" },
  { designStep: "16", track: "resume", name: "Extract job overrides", pipelineStep: "81_post_overrides" },
  { designStep: "17", track: "persist", name: "Persist tailor / profile", pipelineStep: "82_post_persist" },
  { designStep: "18", track: "persist", name: "Cover letter seed", pipelineStep: "83_post_cover_seed" },
  { designStep: "19", track: "resume", name: "ATS readiness AFTER", pipelineStep: "84_post_ats_after" },
  { designStep: "20", track: "pipeline", name: "Extension pipeline state", pipelineStep: "85_post_pipeline_state" },
  { designStep: "21", track: "persist", name: "Quota + usage log", pipelineStep: "30_server_persist" },
  { designStep: "22", track: "client", name: "Manual Refinery validation (UI)", pipelineStep: "05_client_apply" },
  { designStep: "11", track: "resume", name: "Phase 2 baseline enhance", pipelineStep: "26_baseline_start" },
  { designStep: "13", track: "engine", name: "Phase 3 AI upgrade", pipelineStep: "27_ai_upgrade_start", failureCodes: ["provider_error"] },
  { designStep: "8", track: "jd", name: "JD skills vocabulary", pipelineStep: "78a_pre_jd_skills" },
];

export function catalogEntryForDesignStep(
  designStep: EnhanceDesignStepId,
): EnhanceDiagnosticStepDef | undefined {
  return ENHANCE_DIAGNOSTIC_CATALOG.find((e) => e.designStep === designStep);
}

/** Operator cheat sheet — which design step when a pipeline step fails. */
export const PIPELINE_STEP_TO_DESIGN: Partial<Record<string, EnhanceDesignStepId>> = {
  "45_tailor_jd_check": "2",
  "71_pre_onet_fetch": "3",
  "73_pre_keyword_gap": "4",
  "72_pre_bullet_quality": "6",
  "74_pre_ats_parse": "7",
  "75_pre_jd_brain": "8",
  "78a_pre_jd_skills": "8",
  "76_pre_jd_directive": "10",
  "78_pre_brief_start": "9",
  "78e_pre_brief_ready": "9",
  "26_baseline_start": "11",
  "26e_baseline_done": "11",
  "27_ai_upgrade_start": "13",
  "27a_ai_upgrade_blocked": "11",
  "27b_ai_upgrade_success": "13",
  "27c_ai_upgrade_fail": "13",
  "21_engine_pass_generate": "13",
  "22_engine_pass_optimize": "13",
  "24_engine_error": "13",
  "31_server_fail": "13",
  "82_post_persist": "17",
};
