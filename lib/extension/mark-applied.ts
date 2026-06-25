import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";

export type MarkJobAppliedResult =
  | { success: true; id: string; status: JobTrackerStatus; alreadyApplied: boolean }
  | { success: false; error: string; code?: "not_found" };

/** Idempotent transition to APPLIED — used by extension auto-detect and dashboard manual action. */
export async function markJobTrackerApplied(
  userId: string,
  entryId: string,
  source: "extension_auto" | "extension_manual" | "dashboard_manual",
): Promise<MarkJobAppliedResult> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { status: true },
  });

  if (!row) {
    return { success: false, error: "Job not found.", code: "not_found" };
  }

  if (row.status === "APPLIED") {
    return { success: true, id: entryId, status: "APPLIED", alreadyApplied: true };
  }

  if (row.status !== "READY_TO_APPLY") {
    return {
      success: false,
      error: "Complete the apply steps before marking this job as applied.",
      code: "invalid_status",
    };
  }

  await updateJobTrackerStatus(userId, entryId, "APPLIED");
  await mergeJobEntryMetadata(userId, entryId, {
    appliedSource: source,
    appliedMarkedAt: new Date().toISOString(),
    pipelineError: null,
    pipelineErrorCode: null,
  });

  return { success: true, id: entryId, status: "APPLIED", alreadyApplied: false };
}
