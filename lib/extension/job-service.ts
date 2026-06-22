import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus, Prisma } from "@/lib/generated/prisma/client";
import { canonicalizeJobUrl, hashJobUrl } from "@/lib/job-tracker/url-hash";
import {
  attachCaptureDiagnosticsToMetadata,
  logJobCaptureOnSave,
} from "@/lib/job-tracker/capture-log";

export type SaveJobTrackerInput = {
  url: string;
  title: string;
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
};

export async function getJobTrackerStatusForUrl(
  userId: string,
  rawUrl: string,
): Promise<JobTrackerStatusResult> {
  const canonicalUrl = canonicalizeJobUrl(rawUrl);
  const urlHash = hashJobUrl(canonicalUrl);

  const row = await prisma.jobTrackerEntry.findUnique({
    where: { userId_urlHash: { userId, urlHash } },
    select: { id: true, status: true, title: true },
  });

  if (!row) {
    return { saved: false };
  }

  return {
    saved: true,
    id: row.id,
    status: row.status,
    title: row.title,
  };
}

export async function saveJobTrackerEntry(userId: string, input: SaveJobTrackerInput) {
  const canonicalUrl = canonicalizeJobUrl(input.url);
  const urlHash = hashJobUrl(canonicalUrl);
  const title = input.title.trim();
  if (!title) {
    throw new Error("Job title is required");
  }

  const metadata: Prisma.InputJsonValue | undefined = (() => {
    const existing =
      input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {};

    const { metadata: withDiagnostics } = attachCaptureDiagnosticsToMetadata(
      {
        url: canonicalUrl,
        title,
        company: input.company ?? null,
        location: input.location ?? null,
        salaryText: input.salaryText ?? null,
        description: input.description ?? null,
        platform: input.platform ?? null,
        metadata: existing,
        adapter: input.platform ?? null,
        scrapePath:
          typeof existing.scrapePath === "string" ? (existing.scrapePath as string) : null,
        enrichmentsApplied: Array.isArray(existing.enrichmentsApplied)
          ? (existing.enrichmentsApplied as string[])
          : [],
      },
      existing,
    );

    if (input.sourceProfileId?.trim()) {
      withDiagnostics.sourceProfileId = input.sourceProfileId.trim();
    }

    return Object.keys(withDiagnostics).length > 0
      ? (withDiagnostics as Prisma.InputJsonValue)
      : undefined;
  })();

  const saved = await prisma.jobTrackerEntry.upsert({
    where: { userId_urlHash: { userId, urlHash } },
    create: {
      userId,
      canonicalUrl,
      urlHash,
      title,
      company: input.company?.trim() || null,
      location: input.location?.trim() || null,
      salaryText: input.salaryText?.trim() || null,
      description: input.description?.trim() || null,
      platform: input.platform?.trim() || null,
      status: "CAPTURED",
      metadata,
    },
    update: {
      title,
      company: input.company?.trim() || null,
      location: input.location?.trim() || null,
      salaryText: input.salaryText?.trim() || null,
      description: input.description?.trim() || null,
      platform: input.platform?.trim() || null,
      metadata,
    },
    select: {
      id: true,
      status: true,
      title: true,
      company: true,
      canonicalUrl: true,
    },
  });

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
