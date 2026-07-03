import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

function isCaptureGapMessage(message: string): boolean {
  return message.trim().startsWith("Capture gap:");
}

/** Dashboard + extension — capture gaps are warnings, not pipeline failures. */
export function dashboardShowsTrackerIssueAsError(
  issueMessage: string | null | undefined,
  status: JobTrackerStatus,
): boolean {
  const message = issueMessage?.trim();
  if (!message) return false;
  if (
    isCaptureGapMessage(message) &&
    (status === "READY_TO_APPLY" ||
      status === "RESUME_READY" ||
      status === "APPLIED")
  ) {
    return false;
  }
  return true;
}
