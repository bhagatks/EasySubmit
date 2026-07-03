import { prisma } from "@/lib/prisma";
import {
  parsePipelineDebugProgress,
  PIPELINE_DEBUG_METADATA_KEY,
} from "@/src/shared/extension/pipeline-debug-types";
import { resolvePipelineDebugProgressForDisplay } from "@/lib/extension/pipeline-debug-display";
import { findPipelineStepFailure } from "@/lib/job-tracker/pipeline-tracker-view";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";

export type PipelineDebugJobListItem = {
  id: string;
  title: string;
  company: string | null;
  status: string;
  savedAt: string;
  traceId: string | null;
  hasFailure: boolean;
};

function readMetadataObject(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

/** Recent tracker rows that have pipeline debug metadata (Apply runs). */
export async function listPipelineDebugJobs(
  userId: string,
  limit = 50,
): Promise<PipelineDebugJobListItem[]> {
  const rows = await prisma.jobTrackerEntry.findMany({
    where: { userId, archivedAt: null },
    orderBy: { savedAt: "desc" },
    take: Math.min(limit * 3, 150),
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      canonicalUrl: true,
      description: true,
      savedAt: true,
      metadata: true,
    },
  });

  const items: PipelineDebugJobListItem[] = [];

  for (const row of rows) {
    const metadata = readMetadataObject(row.metadata);
    const progress = metadata
      ? parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY])
      : null;
    if (!progress) continue;

    const identity = resolveJobIdentity({
      url: row.canonicalUrl,
      title: row.title,
      company: row.company,
      description: row.description ?? null,
    });

    const displayProgress = resolvePipelineDebugProgressForDisplay(
      progress,
      metadata,
      row.status,
    );

    const hasFailure =
      findPipelineStepFailure(displayProgress) !== null ||
      (typeof metadata?.pipelineError === "string" && metadata.pipelineError.trim().length > 0);

    items.push({
      id: row.id,
      title: row.title.trim() || identity.title,
      company: row.company?.trim() || identity.company || null,
      status: row.status,
      savedAt: row.savedAt.toISOString(),
      traceId: progress.traceId,
      hasFailure,
    });

    if (items.length >= limit) break;
  }

  return items;
}
