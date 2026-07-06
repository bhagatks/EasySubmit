import { prisma } from "@/lib/prisma";

/** True when tailor finished on deterministic fallback after AI was attempted. */
export function isAiTailorIncomplete(
  metadata: Record<string, unknown> | null,
  enhanceMeta: unknown,
): boolean {
  if (
    metadata &&
    typeof metadata.pipelineAiWarning === "string" &&
    metadata.pipelineAiWarning.trim()
  ) {
    return true;
  }

  if (enhanceMeta && typeof enhanceMeta === "object" && !Array.isArray(enhanceMeta)) {
    const meta = enhanceMeta as Record<string, unknown>;
    if (meta.aiAttempted === true && meta.aiSucceeded === false) {
      return true;
    }
  }

  return false;
}

export async function entryHasAiIncompleteTailor(
  userId: string,
  entryId: string,
): Promise<boolean> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: {
      metadata: true,
      resumeTailor: { select: { enhanceMeta: true } },
    },
  });

  if (!row) return false;

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;

  return isAiTailorIncomplete(metadata, row.resumeTailor?.enhanceMeta ?? null);
}
