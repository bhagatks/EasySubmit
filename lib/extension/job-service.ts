import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus, Prisma } from "@/lib/generated/prisma/client";
import { canonicalizeJobUrl, hashJobUrl } from "@/lib/job-tracker/url-hash";
import {
  attachCaptureDiagnosticsToMetadata,
  logJobCaptureOnSave,
} from "@/lib/job-tracker/capture-log";
import { normalizeSaveJobInput } from "@/lib/extension/normalize-save-job";

export type SaveJobTrackerInput = {
  url: string;
  title?: string;
  company?: string | null;
  location?: string | null;
  salaryText?: string | null;
  description?: string | null;
  platform?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceProfileId?: string | null;
};

export type JobTrackerStatusResult = {
  saved: boolean;
  id?: string;
  status?: JobTrackerStatus;
  title?: string;
  /** True when the latest non-archived row is APPLIED — extension shows Re-apply. */
  canReapply?: boolean;
};

const IN_PROGRESS_STATUSES: JobTrackerStatus[] = ["CAPTURED", "RESUME_READY", "READY_TO_APPLY"];

const activeEntrySelect = {
  id: true,
  status: true,
  title: true,
  company: true,
  canonicalUrl: true,
} as const;

function buildUrlHash(rawUrl: string): { canonicalUrl: string; urlHash: string } {
  const canonicalUrl = canonicalizeJobUrl(rawUrl);
  return { canonicalUrl, urlHash: hashJobUrl(canonicalUrl) };
}

/** Most recent non-archived row for this URL — active journey lookup. */
export async function findActiveJobTrackerEntryForUrl(userId: string, rawUrl: string) {
  const { urlHash } = buildUrlHash(rawUrl);

  return prisma.jobTrackerEntry.findFirst({
    where: {
      userId,
      urlHash,
      status: { not: "ARCHIVED" },
      archivedAt: null,
    },
    orderBy: { savedAt: "desc" },
    select: activeEntrySelect,
  });
}

/** In-progress journey row (CAPTURED / RESUME_READY / READY_TO_APPLY) for this URL. */
export async function findInProgressJobTrackerEntryForUrl(userId: string, rawUrl: string) {
  const { urlHash } = buildUrlHash(rawUrl);

  return prisma.jobTrackerEntry.findFirst({
    where: {
      userId,
      urlHash,
      status: { in: IN_PROGRESS_STATUSES },
      archivedAt: null,
    },
    orderBy: { savedAt: "desc" },
    select: activeEntrySelect,
  });
}

export async function getJobTrackerStatusForUrl(
  userId: string,
  rawUrl: string,
): Promise<JobTrackerStatusResult> {
  const row = await findActiveJobTrackerEntryForUrl(userId, rawUrl);

  if (!row) {
    return { saved: false };
  }

  return {
    saved: true,
    id: row.id,
    status: row.status,
    title: row.title,
    canReapply: row.status === "APPLIED",
  };
}

function buildSaveMetadata(
  normalized: {
    company?: string | null;
    location?: string | null;
    salaryText?: string | null;
    description?: string | null;
    platform?: string | null;
    metadata?: Record<string, unknown> | null;
    sourceProfileId?: string | null;
  },
  canonicalUrl: string,
  title: string,
): Prisma.InputJsonValue | undefined {
  const existing =
    normalized.metadata && typeof normalized.metadata === "object"
      ? { ...normalized.metadata }
      : {};

  const { metadata: withDiagnostics } = attachCaptureDiagnosticsToMetadata(
    {
      url: canonicalUrl,
      title,
      company: normalized.company ?? null,
      location: normalized.location ?? null,
      salaryText: normalized.salaryText ?? null,
      description: normalized.description ?? null,
      platform: normalized.platform ?? null,
      metadata: existing,
      adapter: normalized.platform ?? null,
      scrapePath:
        typeof existing.scrapePath === "string" ? (existing.scrapePath as string) : null,
      enrichmentsApplied: Array.isArray(existing.enrichmentsApplied)
        ? (existing.enrichmentsApplied as string[])
        : [],
    },
    existing,
  );

  if (normalized.sourceProfileId?.trim()) {
    withDiagnostics.sourceProfileId = normalized.sourceProfileId.trim();
  }

  return Object.keys(withDiagnostics).length > 0
    ? (withDiagnostics as Prisma.InputJsonValue)
    : undefined;
}

async function archiveAppliedRowForReapply(userId: string, urlHash: string): Promise<void> {
  const appliedRow = await prisma.jobTrackerEntry.findFirst({
    where: {
      userId,
      urlHash,
      status: "APPLIED",
      archivedAt: null,
    },
    orderBy: { savedAt: "desc" },
    select: { id: true },
  });

  if (!appliedRow) return;

  await prisma.jobTrackerEntry.updateMany({
    where: { id: appliedRow.id, userId },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}

export async function saveJobTrackerEntry(userId: string, input: SaveJobTrackerInput) {
  const normalized = normalizeSaveJobInput(input);
  if ("error" in normalized) {
    throw new Error(normalized.error);
  }

  const { canonicalUrl, urlHash } = buildUrlHash(normalized.url);
  const title = normalized.title.trim();
  const metadata = buildSaveMetadata(normalized, canonicalUrl, title);

  const rowData = {
    title,
    company: normalized.company?.trim() || null,
    location: normalized.location?.trim() || null,
    salaryText: normalized.salaryText?.trim() || null,
    description: normalized.description?.trim() || null,
    platform: normalized.platform?.trim() || null,
    metadata,
  };

  const inProgress = await findInProgressJobTrackerEntryForUrl(userId, normalized.url);

  let saved;
  if (inProgress) {
    saved = await prisma.jobTrackerEntry.update({
      where: { id: inProgress.id },
      data: rowData,
      select: activeEntrySelect,
    });
  } else {
    await archiveAppliedRowForReapply(userId, urlHash);

    saved = await prisma.jobTrackerEntry.create({
      data: {
        userId,
        canonicalUrl,
        urlHash,
        status: "CAPTURED",
        ...rowData,
      },
      select: activeEntrySelect,
    });
  }

  const diagnostics =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).captureDiagnostics
      : null;
  if (diagnostics && typeof diagnostics === "object") {
    logJobCaptureOnSave(diagnostics as never, { userId, entryId: saved.id });
  }

  return saved;
}

export async function updateJobTrackerStatus(
  userId: string,
  entryId: string,
  status: JobTrackerStatus,
) {
  const appliedAt = status === "APPLIED" ? new Date() : undefined;

  return prisma.jobTrackerEntry.updateMany({
    where: { id: entryId, userId },
    data: {
      status,
      ...(appliedAt ? { appliedAt } : {}),
    },
  });
}
