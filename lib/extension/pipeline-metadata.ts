import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PipelineMetadataPatch = {
  pipelineError?: string | null;
  pipelineErrorCode?: string | null;
  pipelinePhases?: string[];
  lastTailoredAt?: string;
  sourceProfileId?: string;
  autofillStub?: boolean;
  autofillNote?: string | null;
};

export async function mergeJobEntryMetadata(
  userId: string,
  entryId: string,
  patch: PipelineMetadataPatch,
): Promise<void> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });

  if (!row) return;

  const existing =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  const next: Record<string, unknown> = { ...existing, ...patch };

  if (patch.pipelineError === null) {
    delete next.pipelineError;
    delete next.pipelineErrorCode;
  }

  await prisma.jobTrackerEntry.updateMany({
    where: { id: entryId, userId },
    data: { metadata: next as Prisma.InputJsonValue },
  });
}

export async function recordPipelineTailorError(
  userId: string,
  entryId: string,
  error: string,
  code?: string,
): Promise<void> {
  await mergeJobEntryMetadata(userId, entryId, {
    pipelineError: error,
    pipelineErrorCode: code ?? "tailor_failed",
  });
}
