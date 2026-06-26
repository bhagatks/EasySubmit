"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { entryIssueMessage } from "@/lib/job-tracker/entry-issue";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";
import { attachReviewDocumentsToDetail } from "@/lib/job-tracker/review-documents-map";
import { buildCoverLetterSeedPatch } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { buildTailoredResumePreview } from "@/lib/job-tracker/build-tailored-resume-preview";
import { JOB_TRACKER_EDITABLE_STATUSES } from "@/lib/job-tracker/pipeline";
import type { JobTrackerSummary, JobTrackerDetail } from "@/lib/job-tracker/types";
import { updateJobTrackerStatus, updateJobTrackerEntryFields } from "@/lib/extension/job-service";
import { markJobTrackerApplied } from "@/lib/extension/mark-applied";
import { journeySyncLog } from "@/src/shared/extension/journey-sync-log";
import { resumeProfileDisplayLabel } from "@/lib/extension/resume-profiles";
import { getMergedResumeForJob, updateJobReviewDocuments } from "@/lib/profile/job-resume-tailor";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import {
  jobDetailDraftToFieldsPayload,
  normalizeJobDetailDraft,
  type JobDetailDraft,
} from "@/src/shared/extension/job-detail-edit";
import { canApplyCapture } from "@/src/shared/extension/apply-gate";

const AUTO_ARCHIVE_MS = 24 * 60 * 60 * 1000;

export type JobTrackerListResult =
  | { success: true; entries: JobTrackerSummary[]; autoArchiveAppliedJobs: boolean }
  | { success: false; error: string };

export type UpdateJobTrackerStatusResult =
  | { success: true }
  | { success: false; error: string };

export type JobTrackerMutationResult =
  | { success: true }
  | { success: false; error: string };

function readMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toSummary(entry: {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  status: JobTrackerStatus;
  platform: string | null;
  canonicalUrl: string;
  savedAt: Date;
  appliedAt: Date | null;
  description?: string | null;
  metadata?: unknown;
  resumeTailor?: { id: string } | null;
}): JobTrackerSummary {
  const metadata = readMetadata(entry.metadata);
  const identity = resolveJobIdentity({
    url: entry.canonicalUrl,
    title: entry.title,
    company: entry.company,
    description: entry.description ?? null,
  });
  const company = entry.company?.trim() || identity.company;

  return {
    id: entry.id,
    title: entry.title,
    company,
    location: entry.location,
    salaryText: entry.salaryText,
    status: entry.status,
    platform: entry.platform,
    canonicalUrl: entry.canonicalUrl,
    savedAt: entry.savedAt.toISOString(),
    appliedAt: entry.appliedAt?.toISOString() ?? null,
    hasTailoredResume: Boolean(entry.resumeTailor?.id),
    issueMessage: entryIssueMessage({
      url: entry.canonicalUrl,
      title: entry.title,
      company,
      location: entry.location,
      salaryText: entry.salaryText,
      description: entry.description ?? null,
      platform: entry.platform,
      metadata,
    }),
  };
}

export type JobTrackerEntryResult =
  | { success: true; entry: JobTrackerDetail }
  | { success: false; error: string };

function readSourceProfileId(metadata: Record<string, unknown> | null): string | null {
  const id = metadata?.sourceProfileId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function toDetail(entry: {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  status: JobTrackerStatus;
  platform: string | null;
  canonicalUrl: string;
  savedAt: Date;
  appliedAt: Date | null;
  description: string | null;
  notes: string | null;
  metadata: unknown;
  resumeTailor?: { id: string } | null;
  updatedAt: Date;
}): JobTrackerDetail {
  const metadata = readMetadata(entry.metadata);
  return {
    ...toSummary({ ...entry, metadata }),
    description: entry.description,
    notes: entry.notes,
    metadata,
    hasTailoredResume: Boolean(entry.resumeTailor?.id),
    sourceProfileId: readSourceProfileId(metadata),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

async function runAutoArchiveForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { autoArchiveAppliedJobs: true },
  });

  if (!user?.autoArchiveAppliedJobs) return;

  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_MS);

  await prisma.jobTrackerEntry.updateMany({
    where: {
      userId,
      status: "APPLIED",
      appliedAt: { not: null, lte: cutoff },
    },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}

const listSelect = {
  id: true,
  title: true,
  company: true,
  location: true,
  salaryText: true,
  status: true,
  platform: true,
  canonicalUrl: true,
  savedAt: true,
  appliedAt: true,
  description: true,
  metadata: true,
  resumeTailor: {
    select: {
      id: true,
      coverLetter: true,
      resumeLatex: true,
      coverLetterLatex: true,
      updatedAt: true,
    },
  },
} as const;

export async function getJobTrackerEntryById(entryId: string): Promise<JobTrackerEntryResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!entryId.trim()) {
    return { success: false, error: "Job id is required" };
  }

  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId.trim(), userId },
    select: {
      ...listSelect,
      notes: true,
      updatedAt: true,
    },
  });

  if (!row) {
    return { success: false, error: "Job not found" };
  }

  const entry = toDetail(row);
  let previewError: string | null = null;
  let mergedResume:
    | Awaited<ReturnType<typeof getMergedResumeForJob>>
    | null = null;

  if (entry.hasTailoredResume) {
    const merged = await getMergedResumeForJob(userId, entryId.trim());
    mergedResume = merged;
    if (merged.success) {
      entry.sourceProfileId = merged.sourceProfileId;
      entry.reviewContact = {
        firstName: merged.form.firstName,
        lastName: merged.form.lastName,
        email: merged.form.email,
        phone: merged.form.phone,
      };
      entry.tailoredResumePreview = buildTailoredResumePreview(
        merged.form,
        merged.targetTitle,
        merged.tailor.changedSections,
        merged.tailor.updatedAt,
      );
    } else {
      previewError = merged.error;
    }
  }

  const profileIdForLabel = entry.sourceProfileId;
  if (profileIdForLabel) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileIdForLabel, userId },
      select: { targetTitle: true, firstName: true, lastName: true },
    });
    if (profile) {
      entry.sourceProfileName = resumeProfileDisplayLabel(profile);
    }
  }

  let tailorRow = row.resumeTailor;

  if (tailorRow && !tailorRow.coverLetter?.trim() && mergedResume?.success) {
    const coverPatch = buildCoverLetterSeedPatch({
      form: mergedResume.form,
      targetTitle: mergedResume.targetTitle,
      company: row.company,
      jobTitle: row.title,
      jobDescription: row.description,
      existingCoverLetter: tailorRow.coverLetter,
    });
    if (coverPatch) {
      const seeded = await updateJobReviewDocuments(userId, entryId.trim(), coverPatch);
      if (seeded.success) {
        tailorRow = { ...tailorRow, ...coverPatch };
      }
    }
  }

  const enriched = attachReviewDocumentsToDetail(
    entry,
    tailorRow
      ? {
          coverLetter: tailorRow.coverLetter,
          resumeLatex: tailorRow.resumeLatex,
          coverLetterLatex: tailorRow.coverLetterLatex,
          updatedAt: tailorRow.updatedAt,
        }
      : null,
    previewError,
  );

  return { success: true, entry: enriched };
}

export async function updateJobTrackerEntryDetails(
  entryId: string,
  draft: JobDetailDraft,
): Promise<JobTrackerEntryResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!entryId.trim()) {
    return { success: false, error: "Job id is required" };
  }

  const normalized = normalizeJobDetailDraft(draft);
  if (normalized.title.length < 2) {
    return { success: false, error: "Title is required." };
  }

  const existing = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId.trim(), userId },
    select: { canonicalUrl: true },
  });

  if (!existing) {
    return { success: false, error: "Job not found" };
  }

  if (!canApplyCapture({ url: existing.canonicalUrl, description: normalized.description })) {
    return { success: false, error: "Job description must be at least 120 characters." };
  }

  try {
    const updated = await updateJobTrackerEntryFields(
      userId,
      entryId.trim(),
      jobDetailDraftToFieldsPayload(draft),
    );
    if (!updated) {
      return { success: false, error: "Job not found" };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not save job details.",
    };
  }

  revalidatePath("/dashboard/job-tracker");
  revalidatePath("/dashboard");
  return getJobTrackerEntryById(entryId.trim());
}

export async function listJobTrackerEntries(): Promise<JobTrackerListResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  await runAutoArchiveForUser(userId);

  const [rows, user] = await Promise.all([
    prisma.jobTrackerEntry.findMany({
      where: {
        userId,
        status: { not: "ARCHIVED" },
      },
      orderBy: [{ savedAt: "desc" }],
      select: listSelect,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { autoArchiveAppliedJobs: true },
    }),
  ]);

  return {
    success: true,
    entries: rows.map(toSummary),
    autoArchiveAppliedJobs: user?.autoArchiveAppliedJobs ?? true,
  };
}

export async function listArchivedJobTrackerEntries(): Promise<JobTrackerListResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const [rows, user] = await Promise.all([
    prisma.jobTrackerEntry.findMany({
      where: {
        userId,
        status: "ARCHIVED",
      },
      orderBy: [{ archivedAt: "desc" }, { savedAt: "desc" }],
      select: listSelect,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { autoArchiveAppliedJobs: true },
    }),
  ]);

  return {
    success: true,
    entries: rows.map(toSummary),
    autoArchiveAppliedJobs: user?.autoArchiveAppliedJobs ?? true,
  };
}

export async function archiveJobTrackerEntry(entryId: string): Promise<JobTrackerMutationResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const result = await prisma.jobTrackerEntry.updateMany({
    where: { id: entryId.trim(), userId, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  if (result.count === 0) {
    return { success: false, error: "Job not found" };
  }

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function unarchiveJobTrackerEntry(entryId: string): Promise<JobTrackerMutationResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const existing = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId.trim(), userId, status: "ARCHIVED" },
    select: { appliedAt: true },
  });

  if (!existing) {
    return { success: false, error: "Job not found in archive" };
  }

  await prisma.jobTrackerEntry.update({
    where: { id: entryId.trim() },
    data: {
      status: existing.appliedAt ? "APPLIED" : "CAPTURED",
      archivedAt: null,
    },
  });

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function deleteJobTrackerEntry(entryId: string): Promise<JobTrackerMutationResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const result = await prisma.jobTrackerEntry.deleteMany({
    where: { id: entryId.trim(), userId },
  });

  if (result.count === 0) {
    return { success: false, error: "Job not found" };
  }

  journeySyncLog("server", "job_deleted", {
    entryId: entryId.trim(),
    userId,
  });

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function updateJobTrackerEntryStatus(
  entryId: string,
  status: JobTrackerStatus,
): Promise<UpdateJobTrackerStatusResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  if (!entryId.trim()) {
    return { success: false, error: "Job id is required" };
  }

  if (!JOB_TRACKER_EDITABLE_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const result = await updateJobTrackerStatus(userId, entryId, status);
  if (result.count === 0) {
    return { success: false, error: "Job not found" };
  }

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function markJobTrackerEntryApplied(
  entryId: string,
): Promise<UpdateJobTrackerStatusResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const result = await markJobTrackerApplied(userId, entryId.trim(), "dashboard_manual");
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function getJobTrackerStatsForUser(userId: string): Promise<{
  jobsTracked: number;
  recentEntries: JobTrackerSummary[];
}> {
  await runAutoArchiveForUser(userId);

  const [statusGroups, recentRows] = await Promise.all([
    prisma.jobTrackerEntry.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.jobTrackerEntry.findMany({
      where: {
        userId,
        status: { not: "ARCHIVED" },
      },
      orderBy: [{ savedAt: "desc" }],
      take: 6,
      select: listSelect,
    }),
  ]);

  const statusCounts = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<JobTrackerStatus, number>>;

  const { countJobsTracked } = await import("@/lib/job-tracker/counts");

  return {
    jobsTracked: countJobsTracked(statusCounts),
    recentEntries: recentRows.map(toSummary),
  };
}
