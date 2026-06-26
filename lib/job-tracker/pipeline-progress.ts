import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { BRAND } from "@/src/shared/brand";
import { JOB_TRACKER_KANBAN_COLUMNS } from "@/lib/job-tracker/pipeline";

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

/** Live label for the active pipeline segment (non-active segments use column titles). */
export function pipelineActiveSegmentLabel(status: JobTrackerStatus): string | null {
  switch (status) {
    case "CAPTURED":
      return "Optimizing resume";
    case "RESUME_READY":
    case "READY_TO_APPLY":
      return BRAND.autoSuggestCta;
    default:
      return null;
  }
}
