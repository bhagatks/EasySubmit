import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus, Prisma } from "@/lib/generated/prisma/client";
import { canonicalizeJobUrl, hashJobUrl } from "@/lib/job-tracker/url-hash";
import {
  attachCaptureDiagnosticsToMetadata,
  logJobCaptureOnSave,
} from "@/lib/job-tracker/capture-log";
import { normalizeSaveJobInput } from "@/lib/extension/normalize-save-job";
import { entryIssueMessage } from "@/src/shared/extension/capture-fields";

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

/** Matches extension capture cap — avoids unbounded description storage / JSON parse. */
export const MAX_JOB_DESCRIPTION_CHARS = 48_000;

export async function loadTailorInputFromEntry(
  userId: string,
  entryId: string,
): Promise<SaveJobTrackerInput | null> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: {
      canonicalUrl: true,
      title: true,
      company: true,
      location: true,
      salaryText: true,
      description: true,
      platform: true,
      metadata: true,
    },
  });

  if (!row) return null;

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;
  const sourceProfileId =
    typeof metadata?.sourceProfileId === "string" ? metadata.sourceProfileId : null;

  return {
    url: row.canonicalUrl,
    title: row.title,
    company: row.company,
    location: row.location,
    salaryText: row.salaryText,
    description: row.description,
    platform: row.platform,
    sourceProfileId,
  };
}

export type JobTrackerStatusResult = {
  saved: boolean;
  id?: string;
  status?: JobTrackerStatus;
  title?: string;
  /** True when the latest non-archived row is APPLIED — extension shows Re-apply. */
  canReapply?: boolean;
  /** Matches dashboard tracker issue — server is source of truth for saved jobs. */
  issueMessage?: string | null;
  /** Persisted AI-degraded warning for extension card Bucket A. */
  pipelineAiWarning?: string | null;
};

const IN_PROGRESS_STATUSES: JobTrackerStatus[] = ["CAPTURED", "RESUME_READY", "READY_TO_APPLY"];

const activeEntrySelect = {
  id: true,
  status: true,
  title: true,
  company: true,
  canonicalUrl: true,
  location: true,
  salaryText: true,
  description: true,
  platform: true,
  metadata: true,
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

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;
  const pipelineAiWarning =
    typeof metadata?.pipelineAiWarning === "string" && metadata.pipelineAiWarning.trim()
      ? metadata.pipelineAiWarning.trim()
      : null;

  return {
    saved: true,
    id: row.id,
    status: row.status,
    title: row.title,
    canReapply: row.status === "APPLIED",
    issueMessage: entryIssueMessage({
      url: row.canonicalUrl,
      title: row.title,
      company: row.company,
      location: row.location,
      salaryText: row.salaryText,
      description: row.description,
      platform: row.platform,
      metadata,
    }),
    pipelineAiWarning,
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

function withoutPipelineOutcomeMetadata(
  metadata: Prisma.InputJsonValue | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata;
  }

  const next = { ...(metadata as Record<string, unknown>) };
  delete next.pipelineError;
  delete next.pipelineErrorCode;
  delete next.appliedSource;
  delete next.appliedMarkedAt;
  return next as Prisma.InputJsonValue;
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

async function archiveDuplicateActiveEntries(
  userId: string,
  urlHash: string,
  keepEntryId: string,
): Promise<void> {
  await prisma.jobTrackerEntry.updateMany({
    where: {
      userId,
      urlHash,
      id: { not: keepEntryId },
      archivedAt: null,
      status: { not: "ARCHIVED" },
    },
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
      data: {
        ...rowData,
        metadata: withoutPipelineOutcomeMetadata(metadata),
        status: "CAPTURED",
        appliedAt: null,
      },
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
        metadata: withoutPipelineOutcomeMetadata(metadata),
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

  await archiveDuplicateActiveEntries(userId, urlHash, saved.id);

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

export type UpdateJobTrackerFieldsInput = {
  title?: string;
  company?: string | null;
  location?: string | null;
  salaryText?: string | null;
  description?: string | null;
  platform?: string | null;
  jsonLdFields?: {
    qualifications?: string;
    responsibilities?: string;
    incentives?: string;
  };
};

function mergeJsonLdIntoMetadata(
  existing: Prisma.InputJsonValue | null | undefined,
  jsonLdFields: UpdateJobTrackerFieldsInput["jsonLdFields"],
): Prisma.InputJsonValue | undefined {
  // undefined = caller did not touch jsonLd fields, leave existing as-is
  if (jsonLdFields === undefined) return existing ?? undefined;

  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const nextJsonLd = {
    ...(typeof base.jsonLdFields === "object" && base.jsonLdFields && !Array.isArray(base.jsonLdFields)
      ? (base.jsonLdFields as Record<string, unknown>)
      : {}),
    ...jsonLdFields,
  };

  for (const key of ["qualifications", "responsibilities", "incentives"] as const) {
    if (!nextJsonLd[key]?.toString().trim()) {
      delete nextJsonLd[key];
    }
  }

  if (Object.keys(nextJsonLd).length === 0) {
    delete base.jsonLdFields;
  } else {
    base.jsonLdFields = nextJsonLd;
  }

  return Object.keys(base).length > 0 ? (base as Prisma.InputJsonValue) : undefined;
}

export async function updateJobTrackerEntryFields(
  userId: string,
  entryId: string,
  input: UpdateJobTrackerFieldsInput,
) {
  const existing = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId, archivedAt: null },
    select: { id: true, metadata: true },
  });

  if (!existing) return null;

  const title = input.title?.trim();
  if (title !== undefined && title.length < 2) {
    throw new Error("Title is required.");
  }

  const metadata = mergeJsonLdIntoMetadata(existing.metadata, input.jsonLdFields);

  return prisma.jobTrackerEntry.update({
    where: { id: entryId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(input.company !== undefined ? { company: input.company?.trim() || null } : {}),
      ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
      ...(input.salaryText !== undefined ? { salaryText: input.salaryText?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.platform !== undefined ? { platform: input.platform?.trim() || null } : {}),
      ...(input.jsonLdFields !== undefined ? { metadata } : {}),
    },
    select: activeEntrySelect,
  });
}
