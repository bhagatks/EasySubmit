import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

const STATUS_LABELS: Record<JobTrackerStatus, string> = {
  CAPTURED: "Job captured",
  RESUME_READY: "Resume prepared",
  READY_TO_APPLY: "Ready to apply",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const STATUS_STYLES: Record<JobTrackerStatus, string> = {
  CAPTURED: "bg-muted text-muted-foreground",
  RESUME_READY: "bg-primary/15 text-primary",
  READY_TO_APPLY: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  APPLIED: "bg-mint/15 text-mint",
  INTERVIEW: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  OFFER: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  REJECTED: "bg-destructive/10 text-destructive",
  ARCHIVED: "bg-muted/60 text-muted-foreground",
};

export function jobTrackerStatusLabel(status: JobTrackerStatus): string {
  return STATUS_LABELS[status];
}

export function jobTrackerStatusStyle(status: JobTrackerStatus): string {
  return STATUS_STYLES[status];
}
