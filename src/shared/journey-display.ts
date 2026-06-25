import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type JourneyStage = 0 | 1 | 2 | 3 | "error";

export type JourneyDisplay = {
  stage: JourneyStage;
  label: string;
  applyButtonState: "hidden" | "disabled" | "navigate" | "reapply" | "completed";
  showResumeCard: boolean;
  showAssistCard: boolean;
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
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  if (status == null) {
    return {
      stage: 0,
      label: "Apply",
      applyButtonState: "hidden",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  switch (status) {
    case "CAPTURED":
      return {
        stage: 1,
        label: "Optimizing resume…",
        applyButtonState: "disabled",
        showResumeCard: false,
        showAssistCard: false,
      };
    case "RESUME_READY":
      return {
        stage: 1,
        label: "Resume ready",
        applyButtonState: "disabled",
        showResumeCard: true,
        showAssistCard: false,
      };
    case "READY_TO_APPLY":
      return {
        stage: 2,
        label: "Ready to ApplyAssist",
        applyButtonState: "navigate",
        showResumeCard: true,
        showAssistCard: true,
      };
    case "APPLIED":
      return {
        stage: 3,
        label: "Applied",
        applyButtonState: "completed",
        showResumeCard: false,
        showAssistCard: false,
      };
    default:
      return {
        stage: 1,
        label: "Optimizing resume…",
        applyButtonState: "disabled",
        showResumeCard: false,
        showAssistCard: false,
      };
  }
}
