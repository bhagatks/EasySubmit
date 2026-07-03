import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  APPLY_PIPELINE_USER_LINES,
  resolveApplyPipelineUserMessage,
} from "@/src/shared/extension/apply-pipeline-user-messages";

export { APPLY_PIPELINE_USER_LINES, resolveApplyPipelineUserMessage };

/** @deprecated Prefer APPLY_PIPELINE_USER_LINES — kept for legacy imports. */
export const PIPELINE_SUB_LABELS = {
  optimizingResume: APPLY_PIPELINE_USER_LINES.optimizingResume,
  resumeReadyReview: APPLY_PIPELINE_USER_LINES.readyToApply,
  applyAssistActive: APPLY_PIPELINE_USER_LINES.applyAssistActive,
  readyToApply: APPLY_PIPELINE_USER_LINES.readyToApply,
  applied: APPLY_PIPELINE_USER_LINES.applied,
  appliedViaAssist: APPLY_PIPELINE_USER_LINES.applied,
} as const;

export type PipelineSubLabelInput = {
  status: JobTrackerStatus;
  hasError?: boolean;
  extensionInstalled?: boolean;
  appliedSource?: string | null;
};

/** Sub-label row under the pipeline bar on tracker cards. */
export function resolvePipelineSubLabel(input: PipelineSubLabelInput): string | null {
  const resolved = resolveApplyPipelineUserMessage({
    status: input.status,
    progress: null,
    extensionInstalled: input.extensionInstalled,
  });
  return resolved.line;
}
