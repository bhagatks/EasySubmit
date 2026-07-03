/** Fixed tracker bar segment titles — never change in product UI. */
export const APPLY_PIPELINE_STAGE_LABELS = {
  job_info: "Job info",
  optimized_resume: "Optimized resume",
  auto_suggest: "Auto Suggest",
  applied: "Applied",
} as const;

export type ApplyPipelineStageId = keyof typeof APPLY_PIPELINE_STAGE_LABELS;
