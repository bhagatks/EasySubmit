import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { JourneyDisplay } from "@/src/shared/journey-display";
import { isTailorStalled, type TailorStallInput } from "@/lib/job-tracker/tailor-stall";

export type DashboardTrackerRowChrome = {
  showSpinner: boolean;
  showStudioEdition: boolean;
  studioEditionEnabled: boolean;
  showMarkApplied: boolean;
  markAppliedDisabled: boolean;
  applyLabel: string;
  applyDisabled: boolean;
  applyInteractive: boolean;
  applyCompleted: boolean;
  showRetryOptimize: boolean;
  showErrorBanner: boolean;
  errorLabel: string;
  showReviewRetry: boolean;
};

type ResolveDashboardTrackerRowChromeInput = TailorStallInput & {
  journey: JourneyDisplay;
  rowBusy: boolean;
};

export function resolveDashboardTrackerRowChrome(
  input: ResolveDashboardTrackerRowChromeInput,
): DashboardTrackerRowChrome {
  const stalled = isTailorStalled(input);
  const stageError = input.journey.stage === "error";
  const optimizing =
    input.status === "CAPTURED" && !input.hasTailoredResume && !stalled && !stageError;
  const applyNavigate = input.journey.applyButtonState === "navigate";
  const applyCompleted = input.journey.applyButtonState === "completed";

  const applyLabel = applyCompleted
    ? "Completed"
    : input.journey.applyButtonState === "reapply"
      ? "Re-apply"
      : input.journey.label === "Apply"
        ? "Apply"
        : "Apply assist";

  return {
    showSpinner: optimizing || (input.rowBusy && input.status === "CAPTURED"),
    showStudioEdition: true,
    studioEditionEnabled: Boolean(input.hasTailoredResume),
    showMarkApplied: true,
    markAppliedDisabled: !applyNavigate || applyCompleted || input.rowBusy,
    applyLabel,
    applyDisabled:
      applyCompleted ||
      !applyNavigate ||
      input.journey.applyButtonState === "disabled" ||
      optimizing ||
      stalled ||
      stageError ||
      input.rowBusy,
    applyInteractive: applyNavigate && !applyCompleted,
    applyCompleted,
    showRetryOptimize: stalled || (stageError && input.status === "CAPTURED"),
    showErrorBanner: stageError,
    errorLabel: input.journey.label,
    showReviewRetry: stageError && input.status !== "CAPTURED",
  };
}
