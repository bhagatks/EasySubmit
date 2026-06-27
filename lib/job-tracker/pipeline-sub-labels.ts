import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

/** Canonical sub-label copy for job tracker pipeline rows — do not diverge in UI. */
export const PIPELINE_SUB_LABELS = {
  optimizingResume: "Optimizing resume…",
  resumeReadyReview: "Resume ready",
  applyAssistActive: "Apply assist active",
  readyToApply: "Ready to apply",
  applied: "Applied",
  appliedViaAssist: "Applied via Apply Assist",
} as const;

export type PipelineSubLabelInput = {
  status: JobTrackerStatus;
  hasError?: boolean;
  /** Chrome extension detected on dashboard (enables apply assist). */
  extensionInstalled?: boolean;
  appliedSource?: string | null;
};

function isAppliedViaAssist(appliedSource: string | null | undefined): boolean {
  return appliedSource === "extension_auto" || appliedSource === "extension_manual";
}

/** Sub-label row under the pipeline bar on tracker cards. */
export function resolvePipelineSubLabel(input: PipelineSubLabelInput): string {
  if (input.hasError) {
    return "Something went wrong";
  }

  switch (input.status) {
    case "CAPTURED":
      return PIPELINE_SUB_LABELS.optimizingResume;
    case "RESUME_READY":
      return PIPELINE_SUB_LABELS.resumeReadyReview;
    case "READY_TO_APPLY":
      return input.extensionInstalled
        ? PIPELINE_SUB_LABELS.applyAssistActive
        : PIPELINE_SUB_LABELS.readyToApply;
    case "APPLIED":
    case "INTERVIEW":
    case "OFFER":
    case "REJECTED":
      return isAppliedViaAssist(input.appliedSource)
        ? PIPELINE_SUB_LABELS.appliedViaAssist
        : PIPELINE_SUB_LABELS.applied;
    case "ARCHIVED":
      return PIPELINE_SUB_LABELS.applied;
    default:
      return PIPELINE_SUB_LABELS.optimizingResume;
  }
}
