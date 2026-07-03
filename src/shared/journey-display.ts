import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { BRAND } from "./brand";

export type JourneyStage = 0 | 1 | 2 | 3 | 4 | "error";

export type JourneyDisplay = {
  stage: JourneyStage;
  /** Primary CTA copy when the button is actionable. */
  label: string;
  /** Status line shown above CTAs when the job is saved. */
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
      label: "",
      statusLabel: "",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
      showReviewRow: false,
    };
  }

  if (status == null) {
    return {
      stage: 0,
      label: BRAND.applyCta,
      statusLabel: "",
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
        label: "",
        statusLabel: "",
        applyButtonState: "hidden",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: false,
      };
    case "RESUME_READY":
      return {
        stage: 2,
        label: BRAND.autoSuggestCta,
        statusLabel: "",
        applyButtonState: "disabled",
        showResumeCard: true,
        showAssistCard: false,
        showReviewRow: true,
      };
    case "READY_TO_APPLY":
      return {
        stage: 3,
        label: BRAND.autoSuggestCta,
        statusLabel: "",
        applyButtonState: "navigate",
        showResumeCard: true,
        showAssistCard: false,
        showReviewRow: true,
      };
    case "APPLIED":
      return {
        stage: 4,
        label: "Applied",
        statusLabel: "",
        applyButtonState: "completed",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: true,
      };
    default:
      return {
        stage: 1,
        label: "",
        statusLabel: "",
        applyButtonState: "hidden",
        showResumeCard: false,
        showAssistCard: false,
        showReviewRow: false,
      };
  }
}
