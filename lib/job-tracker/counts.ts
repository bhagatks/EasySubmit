import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  JOB_TRACKER_PIPELINE_STATUSES,
} from "@/lib/job-tracker/pipeline";

/** Count roles actively tracked (pipeline + outcomes — excludes archived). */
export function countJobsTracked(statusCounts: Partial<Record<JobTrackerStatus, number>>): number {
  return JOB_TRACKER_PIPELINE_STATUSES.reduce(
    (sum, status) => sum + (statusCounts[status] ?? 0),
    0,
  );
}
