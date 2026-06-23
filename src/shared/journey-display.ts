import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type JourneyStage = 0 | 1 | "1b" | 2 | 3 | "error";

export type JourneyDisplay = {
  stage: JourneyStage;
  extensionBadge: string;
  extensionPrimaryLabel: string;
  appLabel: string;
  applyEnabled: boolean;
  hasError: boolean;
};

function readPipelineError(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const pipelineError = metadata.pipelineError;
  if (typeof pipelineError === "string" && pipelineError.trim()) return pipelineError.trim();
  return null;
}

/** Map DB status (+ save state) to user-facing journey copy — shared by extension and app. */
export function resolveJourneyDisplay(input: {
  saved: boolean;
  status?: JobTrackerStatus | string;
  metadata?: Record<string, unknown> | null;
  pipelineBusy?: boolean;
  pipelineBusyLabel?: string | null;
  /** Latest non-archived row is APPLIED — user can start a fresh journey. */
  canReapply?: boolean;
}): JourneyDisplay {
  const error = readPipelineError(input.metadata ?? null);
  if (error) {
    return {
      stage: "error",
      extensionBadge: "Needs attention",
      extensionPrimaryLabel: "Review in dashboard",
      appLabel: "Needs attention",
      applyEnabled: false,
      hasError: true,
    };
  }

  if (input.pipelineBusy) {
    return {
      stage: 1,
      extensionBadge: "Preparing",
      extensionPrimaryLabel: input.pipelineBusyLabel ?? "Optimizing resume…",
      appLabel: "Optimizing resume…",
      applyEnabled: false,
      hasError: false,
    };
  }

  if (input.canReapply) {
    return {
      stage: 0,
      extensionBadge: "Applied",
      extensionPrimaryLabel: "Re-apply",
      appLabel: "Applied",
      applyEnabled: true,
      hasError: false,
    };
  }

  if (!input.saved) {
    return {
      stage: 0,
      extensionBadge: "Not saved",
      extensionPrimaryLabel: "Apply",
      appLabel: "",
      applyEnabled: true,
      hasError: false,
    };
  }

  switch (input.status) {
    case "CAPTURED":
      return {
        stage: 1,
        extensionBadge: "Preparing",
        extensionPrimaryLabel: "Optimizing resume…",
        appLabel: "Optimizing resume…",
        applyEnabled: false,
        hasError: false,
      };
    case "RESUME_READY":
      return {
        stage: "1b",
        extensionBadge: "Resume ready",
        extensionPrimaryLabel: "Review in dashboard",
        appLabel: "Resume ready",
        applyEnabled: false,
        hasError: false,
      };
    case "READY_TO_APPLY":
      return {
        stage: 2,
        extensionBadge: "Apply assist",
        extensionPrimaryLabel: "Review in dashboard",
        appLabel: "Apply assist",
        applyEnabled: true,
        hasError: false,
      };
    case "APPLIED":
      return {
        stage: 3,
        extensionBadge: "Applied",
        extensionPrimaryLabel: "Review in dashboard",
        appLabel: "Applied",
        applyEnabled: false,
        hasError: false,
      };
    default:
      return {
        stage: 1,
        extensionBadge: "Job captured",
        extensionPrimaryLabel: "Review in dashboard",
        appLabel: "Job captured",
        applyEnabled: false,
        hasError: false,
      };
  }
}
