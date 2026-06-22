import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";

/** Kanban column definition for Job Tracker board (v1.1 UI). */
export type JobTrackerKanbanColumn = {
  id: string;
  status: JobTrackerStatus;
  title: string;
  description: string;
};

/**
 * EasySubmit apply pipeline — simplified from AutoApplyAI `PipelineStage` / `PipelineVisibleState`.
 *
 * AutoApply reference:
 *   captured → tailoring_resume → resume_ready → ready_to_submit → submitted
 * EasySubmit (web + extension):
 *   CAPTURED → RESUME_READY → READY_TO_APPLY → APPLIED
 */
export const JOB_TRACKER_KANBAN_COLUMNS: JobTrackerKanbanColumn[] = [
  {
    id: "captured",
    status: "CAPTURED",
    title: "Job captured",
    description: "Saved from the extension or dashboard",
  },
  {
    id: "resume-ready",
    status: "RESUME_READY",
    title: "Resume prepared",
    description: "Tailored or enhanced resume ready for this role",
  },
  {
    id: "ready-to-apply",
    status: "READY_TO_APPLY",
    title: "Ready to apply",
    description: "Autofill complete — review and submit on the job site",
  },
  {
    id: "applied",
    status: "APPLIED",
    title: "Applied",
    description: "Application submitted",
  },
];

/** Post-apply outcomes — list filters / secondary board (not primary Kanban v1). */
export const JOB_TRACKER_OUTCOME_STATUSES: JobTrackerStatus[] = [
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ARCHIVED",
];

/** Primary pipeline statuses counted in “Jobs tracked” overview stat. */
export const JOB_TRACKER_PIPELINE_STATUSES: JobTrackerStatus[] = [
  "CAPTURED",
  "RESUME_READY",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export type JobTrackerKanbanColumnGroup = {
  column: JobTrackerKanbanColumn;
  entries: JobTrackerSummary[];
};

/** Map entry status to a primary Kanban column (outcomes land in Applied). */
export function kanbanColumnStatusForEntry(status: JobTrackerStatus): JobTrackerStatus {
  if (status === "ARCHIVED") return "ARCHIVED";
  const primary = JOB_TRACKER_KANBAN_COLUMNS.find((col) => col.status === status);
  if (primary) return primary.status;
  if (JOB_TRACKER_OUTCOME_STATUSES.includes(status)) return "APPLIED";
  return "CAPTURED";
}

/** Group dashboard entries into Kanban columns (newest first within each column). */
export function groupEntriesForKanban(entries: JobTrackerSummary[]): JobTrackerKanbanColumnGroup[] {
  const buckets = new Map<JobTrackerStatus, JobTrackerSummary[]>(
    JOB_TRACKER_KANBAN_COLUMNS.map((col) => [col.status, []]),
  );

  for (const entry of entries) {
    const columnStatus = kanbanColumnStatusForEntry(entry.status);
    if (columnStatus === "ARCHIVED") continue;
    buckets.get(columnStatus)?.push(entry);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  return JOB_TRACKER_KANBAN_COLUMNS.map((column) => ({
    column,
    entries: buckets.get(column.status) ?? [],
  }));
}

/** Statuses the dashboard may set manually (Kanban drag + select). */
export const JOB_TRACKER_EDITABLE_STATUSES: JobTrackerStatus[] = [
  ...JOB_TRACKER_KANBAN_COLUMNS.map((col) => col.status),
  ...JOB_TRACKER_OUTCOME_STATUSES.filter((s) => s !== "ARCHIVED"),
];
