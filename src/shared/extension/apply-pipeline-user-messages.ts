import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type {
  PipelineDebugProgress,
  PipelineDebugStep,
} from "@/src/shared/extension/pipeline-debug-types";
import { PIPELINE_DEBUG_STEP_DEFS } from "@/src/shared/extension/pipeline-debug-types";
import { isAppliedStatus } from "@/lib/job-tracker/pipeline-progress";
import {
  APPLY_PIPELINE_STAGE_LABELS,
  type ApplyPipelineStageId,
} from "@/src/shared/extension/apply-pipeline-stage-labels";

export { APPLY_PIPELINE_STAGE_LABELS, type ApplyPipelineStageId };
export const APPLY_PIPELINE_USER_LINES = {
  jobCapturing: "Job capturing",
  jobCaptured: "Job captured",
  optimizingResume: "Optimizing resume",
  resumeOptimized: "Resume optimized",
  readyToApply: "Ready to apply",
  applyAssistActive: "Apply assist active",
  applied: "Applied",
} as const;

/** Customer-facing failure / warning lines. */
export const APPLY_PIPELINE_FAILURE_LINES = {
  addJobUrl: "Add a job URL.",
  addJobDescription: "Add job description.",
  addRoleTitle: "Add role title.",
  readJobPageFailed: "Couldn't read job page.",
  saveJobFailed: "Couldn't save job.",
  jobCaptureFailed: "Job capture failed.",
  captureGapReview: "Add details in Review.",
  setupResumeProfile: "Set up resume profile.",
  descriptionTooShort: "Description too short.",
  addJobTitle: "Add job title.",
  optimizationUnavailable: "Optimization unavailable.",
  dailyAiLimit: "Daily AI limit reached.",
  fixApiKey: "Fix API key.",
  resumeOptimizationFailed: "Resume optimization failed.",
  saveResumeFailed: "Couldn't save resume.",
  optimizationTimedOut: "Optimization timed out.",
  resumeNotReady: "Resume not ready yet.",
  installExtension: "Install extension.",
  applyAssistFailed: "Apply assist failed.",
  openJobRetry: "Open job and retry.",
} as const;

export type ApplyPipelineUserMessageKind =
  | "idle"
  | "progress"
  | "success"
  | "warning"
  | "error";

export type ApplyPipelineUserMessage = {
  line: string | null;
  kind: ApplyPipelineUserMessageKind;
  stageId: ApplyPipelineStageId;
};

export type ApplyPipelineStepFailureInput = {
  stepId: string;
  label: string;
  detail: string;
  stage: "capture" | "resume_prep" | "ready";
  stageTitle: string;
};

export type ResolveApplyPipelineUserMessageInput = {
  status: JobTrackerStatus;
  progress: PipelineDebugProgress | null;
  stepFailure?: ApplyPipelineStepFailureInput | null;
  issueMessage?: string | null;
  metadata?: unknown;
  extensionInstalled?: boolean;
};

const JOB_INFO_STEPS = new Set(["capture_validate", "capture_save"]);
const RESUME_PREP_STEP_IDS = new Set(
  PIPELINE_DEBUG_STEP_DEFS.filter((def) => def.trackerStage === "resume_prep").map(
    (def) => def.id,
  ),
);
const AUTO_SUGGEST_STEPS = new Set(["status_ready"]);

const STEP_ORDER = new Map(
  PIPELINE_DEBUG_STEP_DEFS.map((def, index) => [def.id, index] as const),
);

function readMetadataObject(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

function stepRow(
  progress: PipelineDebugProgress | null,
  stepId: string,
): PipelineDebugStep | null {
  return progress?.steps.find((row) => row.id === stepId) ?? null;
}

function isStepDone(progress: PipelineDebugProgress | null, stepId: string): boolean {
  const row = stepRow(progress, stepId);
  return row?.status === "done" || row?.status === "skipped";
}

function isStepFailed(progress: PipelineDebugProgress | null, stepId: string): boolean {
  return stepRow(progress, stepId)?.status === "error";
}

function jobInfoComplete(progress: PipelineDebugProgress | null): boolean {
  return (
    isStepDone(progress, "capture_validate") && isStepDone(progress, "capture_save")
  );
}

function resumePrepComplete(progress: PipelineDebugProgress | null): boolean {
  return isStepDone(progress, "persist_overrides");
}

function autoSuggestComplete(
  progress: PipelineDebugProgress | null,
  status: JobTrackerStatus,
): boolean {
  return isStepDone(progress, "status_ready") || status === "READY_TO_APPLY" || isAppliedStatus(status);
}

function activeStep(progress: PipelineDebugProgress | null): PipelineDebugStep | null {
  if (!progress) return null;
  let best: PipelineDebugStep | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const step of progress.steps) {
    if (step.status !== "active") continue;
    const index = STEP_ORDER.get(step.id);
    if (index === undefined || index >= bestIndex) continue;
    best = step;
    bestIndex = index;
  }
  return best;
}

function isCaptureGapMessage(message: string): boolean {
  return message.trim().startsWith("Capture gap:");
}

function failureLineFromCode(code: string | null | undefined): string | null {
  switch (code) {
    case "missing_description":
      return APPLY_PIPELINE_FAILURE_LINES.descriptionTooShort;
    case "no_source_profile":
      return APPLY_PIPELINE_FAILURE_LINES.setupResumeProfile;
    case "invalid_title":
      return APPLY_PIPELINE_FAILURE_LINES.addJobTitle;
    case "capacity_exhausted":
      return APPLY_PIPELINE_FAILURE_LINES.dailyAiLimit;
    case "persist_failed":
      return APPLY_PIPELINE_FAILURE_LINES.saveResumeFailed;
    case "enhance_failed":
    case "tailor_failed":
      return APPLY_PIPELINE_FAILURE_LINES.resumeOptimizationFailed;
    default:
      return null;
  }
}

function failureLineFromStep(stepId: string): string {
  if (JOB_INFO_STEPS.has(stepId)) {
    return stepId === "capture_validate"
      ? APPLY_PIPELINE_FAILURE_LINES.readJobPageFailed
      : APPLY_PIPELINE_FAILURE_LINES.saveJobFailed;
  }
  if (stepId === "profile_load") return APPLY_PIPELINE_FAILURE_LINES.setupResumeProfile;
  if (stepId === "pre_validate") return APPLY_PIPELINE_FAILURE_LINES.descriptionTooShort;
  if (stepId === "ai_gates") return APPLY_PIPELINE_FAILURE_LINES.optimizationUnavailable;
  if (stepId === "ai_pass1" || stepId === "ai_pass2") {
    return APPLY_PIPELINE_FAILURE_LINES.resumeOptimizationFailed;
  }
  if (stepId === "post_process" || stepId === "persist_overrides") {
    return APPLY_PIPELINE_FAILURE_LINES.saveResumeFailed;
  }
  if (AUTO_SUGGEST_STEPS.has(stepId)) return APPLY_PIPELINE_FAILURE_LINES.applyAssistFailed;
  if (RESUME_PREP_STEP_IDS.has(stepId)) {
    return APPLY_PIPELINE_FAILURE_LINES.resumeOptimizationFailed;
  }
  return APPLY_PIPELINE_FAILURE_LINES.jobCaptureFailed;
}

function failureLineFromIssueMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (isCaptureGapMessage(trimmed)) return APPLY_PIPELINE_FAILURE_LINES.captureGapReview;
  if (/api key/i.test(trimmed)) return APPLY_PIPELINE_FAILURE_LINES.fixApiKey;
  if (/job URL/i.test(trimmed) || trimmed === "Add a job URL to continue.") {
    return APPLY_PIPELINE_FAILURE_LINES.addJobUrl;
  }
  if (/job description/i.test(trimmed) || /at least 120/i.test(trimmed)) {
    return APPLY_PIPELINE_FAILURE_LINES.addJobDescription;
  }
  if (/role title/i.test(trimmed)) return APPLY_PIPELINE_FAILURE_LINES.addRoleTitle;
  if (/timed out|taking too long/i.test(trimmed)) {
    return APPLY_PIPELINE_FAILURE_LINES.optimizationTimedOut;
  }
  if (/quota|capacity/i.test(trimmed)) return APPLY_PIPELINE_FAILURE_LINES.dailyAiLimit;
  if (/tailor|enhance failed|optimization failed/i.test(trimmed)) {
    return APPLY_PIPELINE_FAILURE_LINES.resumeOptimizationFailed;
  }
  if (/failed/i.test(trimmed)) return APPLY_PIPELINE_FAILURE_LINES.jobCaptureFailed;
  return null;
}

function resolveFailureMessage(input: ResolveApplyPipelineUserMessageInput): ApplyPipelineUserMessage | null {
  const metadata = readMetadataObject(input.metadata);
  const pipelineErrorCode =
    typeof metadata?.pipelineErrorCode === "string" ? metadata.pipelineErrorCode : null;
  const codeLine = failureLineFromCode(pipelineErrorCode);
  if (codeLine) {
    const stageId = input.stepFailure
      ? stageIdFromTrackerStage(input.stepFailure.stage)
      : inferStageFromStatus(input.status, input.progress);
    return { line: codeLine, kind: "error", stageId };
  }

  if (input.stepFailure) {
    return {
      line: failureLineFromStep(input.stepFailure.stepId),
      kind: "error",
      stageId: stageIdFromTrackerStage(input.stepFailure.stage),
    };
  }

  const issue = input.issueMessage?.trim();
  if (issue && !isCaptureGapMessage(issue)) {
    const mapped = failureLineFromIssueMessage(issue);
    if (mapped && mapped !== APPLY_PIPELINE_FAILURE_LINES.captureGapReview) {
      return {
        line: mapped,
        kind: "error",
        stageId: inferStageFromStatus(input.status, input.progress),
      };
    }
  }

  for (const stepId of [...JOB_INFO_STEPS, ...RESUME_PREP_STEP_IDS, ...AUTO_SUGGEST_STEPS]) {
    if (isStepFailed(input.progress ?? null, stepId)) {
      return {
        line: failureLineFromStep(stepId),
        kind: "error",
        stageId: stageIdFromStepId(stepId),
      };
    }
  }

  return null;
}

function stageIdFromTrackerStage(stage: ApplyPipelineStepFailureInput["stage"]): ApplyPipelineStageId {
  switch (stage) {
    case "capture":
      return "job_info";
    case "resume_prep":
      return "optimized_resume";
    case "ready":
      return "auto_suggest";
    default:
      return "job_info";
  }
}

function stageIdFromStepId(stepId: string): ApplyPipelineStageId {
  if (JOB_INFO_STEPS.has(stepId)) return "job_info";
  if (RESUME_PREP_STEP_IDS.has(stepId)) return "optimized_resume";
  if (AUTO_SUGGEST_STEPS.has(stepId)) return "auto_suggest";
  return "job_info";
}

function inferStageFromStatus(
  status: JobTrackerStatus,
  progress: PipelineDebugProgress | null,
): ApplyPipelineStageId {
  if (isAppliedStatus(status)) return "applied";
  if (status === "READY_TO_APPLY") return "auto_suggest";
  if (status === "RESUME_READY") return "auto_suggest";
  if (jobInfoComplete(progress) && !resumePrepComplete(progress)) return "optimized_resume";
  return "job_info";
}

function resolveWarningMessage(input: ResolveApplyPipelineUserMessageInput): ApplyPipelineUserMessage | null {
  const issue = input.issueMessage?.trim();
  if (!issue || !isCaptureGapMessage(issue)) return null;
  return {
    line: APPLY_PIPELINE_FAILURE_LINES.captureGapReview,
    kind: "warning",
    stageId: "job_info",
  };
}

function resolveProgressMessage(input: ResolveApplyPipelineUserMessageInput): ApplyPipelineUserMessage {
  const { status, progress } = input;

  if (progress == null) {
    if (isAppliedStatus(status)) {
      return {
        line: APPLY_PIPELINE_USER_LINES.applied,
        kind: "success",
        stageId: "applied",
      };
    }
    if (status === "READY_TO_APPLY") {
      return {
        line: APPLY_PIPELINE_USER_LINES.readyToApply,
        kind: "success",
        stageId: "auto_suggest",
      };
    }
    if (status === "RESUME_READY") {
      return {
        line: APPLY_PIPELINE_USER_LINES.readyToApply,
        kind: "progress",
        stageId: "auto_suggest",
      };
    }
    if (status === "CAPTURED") {
      return {
        line: APPLY_PIPELINE_USER_LINES.optimizingResume,
        kind: "progress",
        stageId: "optimized_resume",
      };
    }
  }

  if (isAppliedStatus(status)) {
    return {
      line: APPLY_PIPELINE_USER_LINES.applied,
      kind: "success",
      stageId: "applied",
    };
  }

  if (status === "READY_TO_APPLY" && autoSuggestComplete(progress, status)) {
    return {
      line: APPLY_PIPELINE_USER_LINES.readyToApply,
      kind: "success",
      stageId: "auto_suggest",
    };
  }

  if (status === "RESUME_READY" && resumePrepComplete(progress)) {
    return {
      line: APPLY_PIPELINE_USER_LINES.readyToApply,
      kind: "progress",
      stageId: "auto_suggest",
    };
  }

  const running = activeStep(progress);
  if (running) {
    if (JOB_INFO_STEPS.has(running.id)) {
      return {
        line: APPLY_PIPELINE_USER_LINES.jobCapturing,
        kind: "progress",
        stageId: "job_info",
      };
    }
    if (RESUME_PREP_STEP_IDS.has(running.id)) {
      return {
        line: APPLY_PIPELINE_USER_LINES.optimizingResume,
        kind: "progress",
        stageId: "optimized_resume",
      };
    }
    if (AUTO_SUGGEST_STEPS.has(running.id)) {
      return {
        line: APPLY_PIPELINE_USER_LINES.applyAssistActive,
        kind: "progress",
        stageId: "auto_suggest",
      };
    }
  }

  if (!jobInfoComplete(progress)) {
    return {
      line: APPLY_PIPELINE_USER_LINES.jobCapturing,
      kind: "progress",
      stageId: "job_info",
    };
  }

  if (!resumePrepComplete(progress)) {
    if (status === "CAPTURED") {
      return {
        line: APPLY_PIPELINE_USER_LINES.optimizingResume,
        kind: "progress",
        stageId: "optimized_resume",
      };
    }
    return {
      line: APPLY_PIPELINE_USER_LINES.optimizingResume,
      kind: "progress",
      stageId: "optimized_resume",
    };
  }

  if (!autoSuggestComplete(progress, status)) {
    return {
      line: APPLY_PIPELINE_USER_LINES.resumeOptimized,
      kind: "success",
      stageId: "optimized_resume",
    };
  }

  return { line: null, kind: "idle", stageId: "auto_suggest" };
}

/** Map internal trackerStage to fixed customer segment title. */
export function applyPipelineStageLabelFromTrackerStage(
  stage: "capture" | "resume_prep" | "ready",
): string {
  switch (stage) {
    case "capture":
      return APPLY_PIPELINE_STAGE_LABELS.job_info;
    case "resume_prep":
      return APPLY_PIPELINE_STAGE_LABELS.optimized_resume;
    case "ready":
      return APPLY_PIPELINE_STAGE_LABELS.auto_suggest;
    default:
      return APPLY_PIPELINE_STAGE_LABELS.job_info;
  }
}

/** Single customer-facing status line — shared by tracker, extension, pipeline QA header. */
export function resolveApplyPipelineUserMessage(
  input: ResolveApplyPipelineUserMessageInput,
): ApplyPipelineUserMessage {
  const failure = resolveFailureMessage(input);
  if (failure) return failure;

  const warning = resolveWarningMessage(input);
  if (warning) return warning;

  return resolveProgressMessage(input);
}

/** Dev-only detail string — raw pipeline step / issue for QA screens. */
export function formatApplyPipelineDevDetail(input: {
  stepFailure?: ApplyPipelineStepFailureInput | null;
  issueMessage?: string | null;
}): string | null {
  if (input.stepFailure) {
    const detail = input.stepFailure.detail?.trim();
    return detail
      ? `${input.stepFailure.label} — ${detail}`
      : input.stepFailure.label;
  }
  const issue = input.issueMessage?.trim();
  return issue || null;
}

function normalizeBusyLabel(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes("optimiz")) return APPLY_PIPELINE_USER_LINES.optimizingResume;
  if (lower.includes("captur") || lower.includes("saving")) {
    return APPLY_PIPELINE_USER_LINES.jobCapturing;
  }
  if (lower.includes("prepar") || lower.includes("finaliz")) {
    return APPLY_PIPELINE_USER_LINES.applyAssistActive;
  }
  if (lower.includes("fill")) return APPLY_PIPELINE_USER_LINES.applyAssistActive;
  return trimmed.replace(/…/g, "").trim() || null;
}

/** Extension card status line — same copy as tracker sub-label. */
export function resolveExtensionUserMessage(input: {
  saved: boolean;
  status?: JobTrackerStatus | null;
  pipelineBusy: boolean;
  pipelineBusyLabel?: string | null;
  saveError?: string | null;
  issueMessage?: string | null;
}): ApplyPipelineUserMessage {
  if (input.pipelineBusy) {
    const busyLine =
      normalizeBusyLabel(input.pipelineBusyLabel) ?? APPLY_PIPELINE_USER_LINES.jobCapturing;
    const stageId =
      busyLine === APPLY_PIPELINE_USER_LINES.optimizingResume
        ? "optimized_resume"
        : busyLine === APPLY_PIPELINE_USER_LINES.applyAssistActive
          ? "auto_suggest"
          : "job_info";
    return { line: busyLine, kind: "progress", stageId };
  }

  if (!input.saved) {
    return { line: null, kind: "idle", stageId: "job_info" };
  }

  return resolveApplyPipelineUserMessage({
    status: (input.status as JobTrackerStatus | undefined) ?? "CAPTURED",
    progress: null,
    issueMessage: input.issueMessage ?? input.saveError,
  });
}
