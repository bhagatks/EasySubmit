import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { JourneyDisplay } from "@/src/shared/journey-display";
import { isTailorStalled, type TailorStallInput } from "@/lib/job-tracker/tailor-stall";

export type DashboardTrackerRowChrome = {
  showSpinner: boolean;
  showResumeStudio: boolean;
  resumeStudioEnabled: boolean;
  showMarkApplied: boolean;
  markAppliedDisabled: boolean;
  applyLabel: string;
  applyDisabled: boolean;
  applyInteractive: boolean;
  applyCompleted: boolean;
  showRetryOptimize: boolean;
};

type ResolveDashboardTrackerRowChromeInput = TailorStallInput & {
  journey: JourneyDisplay;
  rowBusy: boolean;
  pipelineStepFailure?: boolean;
  /** Tailor/pipeline issue — disables Apply + may show Retry optimize; not a row button. */
  hasBlockingIssue?: boolean;
};

export function resolveDashboardTrackerRowChrome(
  input: ResolveDashboardTrackerRowChromeInput,
): DashboardTrackerRowChrome {
  const stalled = isTailorStalled(input);
  const pipelineBlocked = Boolean(input.pipelineStepFailure);
  const blocked = Boolean(input.hasBlockingIssue) || pipelineBlocked;
  const optimizing =
    input.status === "CAPTURED" && !input.hasTailoredResume && !stalled && !blocked;
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
    showResumeStudio: true,
    resumeStudioEnabled: Boolean(input.hasTailoredResume),
    showMarkApplied: true,
    markAppliedDisabled: !applyNavigate || applyCompleted || input.rowBusy,
    applyLabel,
    applyDisabled:
      applyCompleted ||
      !applyNavigate ||
      input.journey.applyButtonState === "disabled" ||
      optimizing ||
      stalled ||
      blocked ||
      input.rowBusy,
    applyInteractive: applyNavigate && !applyCompleted && !pipelineBlocked && !blocked,
    applyCompleted,
    showRetryOptimize:
      stalled || pipelineBlocked || (Boolean(input.hasBlockingIssue) && input.status === "CAPTURED"),
  };
}
