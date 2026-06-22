import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type ReviewScreenPanel = "job" | "resume" | "cover" | "apply";

export const REVIEW_SCREEN_PANELS: ReviewScreenPanel[] = ["job", "resume", "cover", "apply"];

export const REVIEW_SCREEN_PANEL_LABELS: Record<ReviewScreenPanel, string> = {
  job: "Job",
  resume: "Resume",
  cover: "Cover letter",
  apply: "Apply",
};

export function isReviewScreenPanel(value: string | null | undefined): value is ReviewScreenPanel {
  return value != null && REVIEW_SCREEN_PANELS.includes(value as ReviewScreenPanel);
}

/** Default Review Screen tab when opening from the tracker. */
export function defaultReviewScreenPanel(status: JobTrackerStatus): ReviewScreenPanel {
  if (status === "RESUME_READY") return "resume";
  if (status === "READY_TO_APPLY") return "apply";
  return "job";
}

export function jobTrackerReviewScreenUrl(
  jobId: string,
  panel: ReviewScreenPanel = "job",
): string {
  const params = new URLSearchParams({ job: jobId, panel });
  return `/dashboard/job-tracker?${params.toString()}`;
}

/** @deprecated Use review-screen-ui exports */
export type JobReviewPanel = ReviewScreenPanel;
/** @deprecated */
export const JOB_REVIEW_PANELS = REVIEW_SCREEN_PANELS;
/** @deprecated */
export const JOB_REVIEW_PANEL_LABELS = REVIEW_SCREEN_PANEL_LABELS;
/** @deprecated */
export const isJobReviewPanel = isReviewScreenPanel;
/** @deprecated */
export const defaultReviewPanel = defaultReviewScreenPanel;
/** @deprecated */
export const jobTrackerReviewUrl = jobTrackerReviewScreenUrl;
