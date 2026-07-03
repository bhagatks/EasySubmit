import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { JOB_TRACKER_KANBAN_COLUMNS } from "@/lib/job-tracker/pipeline";
import { APPLY_PIPELINE_STAGE_LABELS } from "@/src/shared/extension/apply-pipeline-stage-labels";

export type PipelineStep = {
  id: string;
  label: string;
  status: JobTrackerStatus;
};

export const PIPELINE_STEPS: PipelineStep[] = JOB_TRACKER_KANBAN_COLUMNS.map((column) => ({
  id: column.id,
  label: column.title,
  status: column.status,
}));

/** Compact labels for inline pipeline bars — fixed; never swap per status. */
export const PIPELINE_BAR_STEP_LABELS: Record<string, string> = {
  captured: APPLY_PIPELINE_STAGE_LABELS.job_info,
  "resume-ready": APPLY_PIPELINE_STAGE_LABELS.optimized_resume,
  "ready-to-apply": APPLY_PIPELINE_STAGE_LABELS.auto_suggest,
  applied: APPLY_PIPELINE_STAGE_LABELS.applied,
};

export function pipelineBarStepLabel(step: PipelineStep): string {
  return PIPELINE_BAR_STEP_LABELS[step.id] ?? step.label;
}

export type PipelineProgress = {
  /** 1–4 segments filled through this step */
  filledThrough: number;
  /** 1–4 active segment index, or null when all complete */
  currentIndex: number | null;
  isComplete: boolean;
};

/** Map tracker status to pizza-bar segment fill state. */
export function pipelineProgressForStatus(status: JobTrackerStatus): PipelineProgress {
  if (isAppliedStatus(status) || status === "ARCHIVED") {
    return {
      filledThrough: PIPELINE_STEPS.length,
      currentIndex: null,
      isComplete: true,
    };
  }

  switch (status) {
    case "CAPTURED":
      return { filledThrough: 1, currentIndex: 2, isComplete: false };
    case "RESUME_READY":
    case "READY_TO_APPLY":
      return { filledThrough: 2, currentIndex: 3, isComplete: false };
    default:
      return { filledThrough: 0, currentIndex: 1, isComplete: false };
  }
}

export function canStartApply(status: JobTrackerStatus): boolean {
  return status === "READY_TO_APPLY";
}

export function isAppliedStatus(status: JobTrackerStatus): boolean {
  return (
    status === "APPLIED" ||
    status === "INTERVIEW" ||
    status === "OFFER" ||
    status === "REJECTED"
  );
}

/** @deprecated Bar segment titles are fixed — use pipelineBarStepLabel only. */
export function pipelineActiveSegmentLabel(_status: JobTrackerStatus): string | null {
  return null;
}

/** @deprecated Bar segment titles are fixed — use pipelineBarStepLabel only. */
export function pipelineActiveBarSegmentLabel(_status: JobTrackerStatus): string | null {
  return null;
}

