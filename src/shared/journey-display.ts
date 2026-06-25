import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type JourneyStage = 0 | 1 | 2 | 3 | "error";

export type JourneyDisplay = {
  stage: JourneyStage;
  /** Primary CTA copy when the button is actionable. */
  label: string;
  /** Status line shown above the CTA when the job is saved. */
  statusLabel: string;
  applyButtonState: "hidden" | "disabled" | "navigate" | "reapply" | "completed";
  /** @deprecated Use showReviewRow — stacked resume card removed. */
  showResumeCard: boolean;
  /** @deprecated Assist card removed from extension layout. */
  showAssistCard: boolean;
  showReviewRow: boolean;
};

/** Map DB status to user-facing journey copy — shared by extension and app. */
export function resolveJourneyDisplay(
  status: JobTrackerStatus | null,
  hasError: boolean,
): JourneyDisplay {
  if (hasError) {
    return {
      stage: "error",
      label: "Something went wrong",
      statusLabel: "Something went wrong",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
      showReviewRow: false,
    };
  }

  if (status == null) {
    return {
      stage: 0,
      label: "Apply",
      statusLabel: "Apply",
      applyButtonState: "hidden",
      showResumeCard: false,
      showAssistCard: false,
      showReviewRow: false,
    };
  }

  switch (status) {
    case "CAPTURED":
      return {
        stage: 1,
        label: "Apply",
        statusLabel: "Optimizing resume…",
        applyButtonState: "disabled",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: false,
      };
    case "RESUME_READY":
      return {
        stage: 1,
        label: "Apply",
        statusLabel: "Resume ready",
        applyButtonState: "disabled",
        showResumeCard: true,
        showAssistCard: false,
        showReviewRow: true,
      };
    case "READY_TO_APPLY":
      return {
        stage: 2,
        label: "Apply",
        statusLabel: "Ready to apply",
        applyButtonState: "navigate",
        showResumeCard: true,
        showAssistCard: false,
        showReviewRow: true,
      };
    case "APPLIED":
      return {
        stage: 3,
        label: "Applied",
        statusLabel: "Applied",
        applyButtonState: "completed",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: true,
      };
    default:
      return {
        stage: 1,
        label: "Apply",
        statusLabel: "Optimizing resume…",
        applyButtonState: "disabled",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: false,
      };
  }
}
