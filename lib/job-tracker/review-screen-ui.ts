import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type ReviewScreenPanel = "job" | "resume" | "cover" | "ats";

export const REVIEW_SCREEN_PANELS: ReviewScreenPanel[] = ["job", "resume", "cover", "ats"];

export const REVIEW_SCREEN_PANEL_LABELS: Record<ReviewScreenPanel, string> = {
  job: "Job",
  resume: "Resume",
  cover: "Cover letter",
  ats: "ATS Analysis",
};

export function isReviewScreenPanel(value: string | null | undefined): value is ReviewScreenPanel {
  return value != null && REVIEW_SCREEN_PANELS.includes(value as ReviewScreenPanel);
}

/** Default Review Screen tab when opening from the tracker. */
export function defaultReviewScreenPanel(status: JobTrackerStatus): ReviewScreenPanel {
  if (status === "RESUME_READY" || status === "READY_TO_APPLY") return "resume";
  return "job";
}

export function jobTrackerReviewScreenUrl(
  jobId: string,
  panel: ReviewScreenPanel = "job",
): string {
  const params = new URLSearchParams({ job: jobId, panel });
  return `/dashboard/job-tracker?${params.toString()}`;
}

/** Query value for job resume Studio opened from Review Screen (hides dashboard chrome). */
export const REVIEW_STUDIO_FROM_PARAM = "review";

export function jobTrackerReviewStudioUrl(jobId: string): string {
  const params = new URLSearchParams({ from: REVIEW_STUDIO_FROM_PARAM });
  return `/dashboard/job-tracker/${jobId}/resume?${params.toString()}`;
}

export function isJobReviewStudioRoute(pathname: string): boolean {
  return /^\/dashboard\/job-tracker\/[^/]+\/resume\/?$/.test(pathname);
}

export function parseJobReviewStudioJobId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/job-tracker\/([^/]+)\/resume\/?$/);
  return match?.[1] ?? null;
}

export function isJobReviewStudioContext(
  pathname: string,
  fromParam: string | null | undefined,
): boolean {
  return isJobReviewStudioRoute(pathname) && fromParam === REVIEW_STUDIO_FROM_PARAM;
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
