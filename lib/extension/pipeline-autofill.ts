import { advancePipelineAfterAutofill } from "@/lib/extension/apply-pipeline";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";
import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

export type CompletePipelineAutofillResult =
  | { success: true; id: string; status: JobTrackerStatus }
  | { success: false; error: string; code?: "not_found" | "invalid_state" };

const AUTOFILL_READY_FROM: JobTrackerStatus[] = ["RESUME_READY"];

/** Phase C scaffold — marks job READY_TO_APPLY after autofill (stub or real runner). */
export async function completePipelineAutofill(
  userId: string,
  entryId: string,
  options?: { stub?: boolean; note?: string },
): Promise<CompletePipelineAutofillResult> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { status: true },
  });

  if (!row) {
    return { success: false, error: "Job not found.", code: "not_found" };
  }

  if (!AUTOFILL_READY_FROM.includes(row.status)) {
    if (row.status === "READY_TO_APPLY" || row.status === "APPLIED") {
      return { success: true, id: entryId, status: row.status };
    }
    return {
      success: false,
      error: "Resume must be prepared before autofill can complete.",
      code: "invalid_state",
    };
  }

  await advancePipelineAfterAutofill(userId, entryId);
  await mergeJobEntryMetadata(userId, entryId, {
    pipelineError: null,
    pipelineErrorCode: null,
    pipelinePhases: ["capture", "tailor", "autofill"],
    ...(options?.stub ? { autofillStub: true, autofillNote: options.note ?? null } : {}),
  });

  return { success: true, id: entryId, status: "READY_TO_APPLY" };
}
