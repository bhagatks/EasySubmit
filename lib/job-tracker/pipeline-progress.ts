import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
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

const PIPELINE_STATUS_ORDER: JobTrackerStatus[] = [
  "CAPTURED",
  "RESUME_READY",
  "READY_TO_APPLY",
  "APPLIED",
];

function pipelineIndex(status: JobTrackerStatus): number {
  if (status === "ARCHIVED") return 3;
  const idx = PIPELINE_STATUS_ORDER.indexOf(status);
  if (idx >= 0) return idx;
  // Legacy outcomes map to applied column.
  if (status === "INTERVIEW" || status === "OFFER" || status === "REJECTED") return 3;
  return 0;
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
  const idx = pipelineIndex(status);
  const isComplete = idx >= PIPELINE_STATUS_ORDER.length - 1;

  if (isComplete) {
    return {
      filledThrough: PIPELINE_STEPS.length,
      currentIndex: null,
      isComplete: true,
    };
  }

  return {
    filledThrough: idx + 1,
    currentIndex: idx + 2,
    isComplete: false,
  };
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
      return "Resume ready";
    default:
      return null;
  }
}
