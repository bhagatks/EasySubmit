import type { Prisma } from "@/lib/generated/prisma/client";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  mergeProfileWithOverrides,
  parseJobResumeOverrides,
  type JobResumeOverrides,
} from "@/lib/profile/job-resume-overrides";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { prisma } from "@/lib/prisma";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";

export type JobResumeTailorRecord = {
  id: string;
  jobTrackerEntryId: string;
  sourceProfileId: string;
  overrides: JobResumeOverrides;
  changedSections: StudioEditorSectionId[];
  enhanceTraceId: string | null;
  coverLetter: string | null;
  resumeLatex: string | null;
  coverLetterLatex: string | null;
  updatedAt: string;
};

export type ProfileDependentJob = {
  id: string;
  title: string;
  company: string | null;
  status: string;
};

export type UpsertJobResumeTailorInput = {
  jobTrackerEntryId: string;
  userId: string;
  sourceProfileId: string;
  overrides: JobResumeOverrides;
  changedSections: StudioEditorSectionId[];
  enhanceTraceId?: string | null;
};

export async function upsertJobResumeTailor(
  input: UpsertJobResumeTailorInput,
): Promise<JobResumeTailorRecord> {
  const row = await prisma.jobResumeTailor.upsert({
    where: { jobTrackerEntryId: input.jobTrackerEntryId },
    create: {
      jobTrackerEntryId: input.jobTrackerEntryId,
      userId: input.userId,
      sourceProfileId: input.sourceProfileId,
      overrides: input.overrides as Prisma.InputJsonValue,
      changedSections: input.changedSections,
      enhanceTraceId: input.enhanceTraceId ?? null,
    },
    update: {
      sourceProfileId: input.sourceProfileId,
      overrides: input.overrides as Prisma.InputJsonValue,
      changedSections: input.changedSections,
      enhanceTraceId: input.enhanceTraceId ?? null,
    },
  });

  return toRecord(row);
}

export async function getJobResumeTailorForEntry(
  userId: string,
  jobTrackerEntryId: string,
): Promise<JobResumeTailorRecord | null> {
  const row = await prisma.jobResumeTailor.findFirst({
    where: { jobTrackerEntryId, userId },
  });
  return row ? toRecord(row) : null;
}

export async function hasJobResumeTailor(userId: string, jobTrackerEntryId: string): Promise<boolean> {
  const count = await prisma.jobResumeTailor.count({
    where: { jobTrackerEntryId, userId },
  });
  return count > 0;
}

export async function deleteJobResumeTailor(userId: string, jobTrackerEntryId: string): Promise<void> {
  await prisma.jobResumeTailor.deleteMany({
    where: { jobTrackerEntryId, userId },
  });
}

export async function getMergedResumeForJob(
  userId: string,
  jobTrackerEntryId: string,
): Promise<
  | {
      success: true;
      form: HubRefineryForm;
      targetTitle: string;
      sourceProfileId: string;
      rawResumeText: string | null;
      tailor: JobResumeTailorRecord;
    }
  | { success: false; error: string }
> {
  const tailor = await getJobResumeTailorForEntry(userId, jobTrackerEntryId);
  if (!tailor) {
    return { success: false, error: "No tailored resume for this job" };
  }

  const source = await findProfileForUser(userId, tailor.sourceProfileId);
  if (!source) {
    return { success: false, error: "Source resume profile not found" };
  }

  const baseForm = hubRefineryFormFromProfile(source);
  const baseTargetTitle = targetTitleFromProfile(source);
  const merged = mergeProfileWithOverrides(baseForm, baseTargetTitle, tailor.overrides);

  return {
    success: true,
    form: merged.form,
    targetTitle: merged.targetTitle,
    sourceProfileId: tailor.sourceProfileId,
    rawResumeText: source.resumeRawText,
    tailor,
  };
}

export async function listJobsDependingOnProfile(
  userId: string,
  sourceProfileId: string,
): Promise<ProfileDependentJob[]> {
  const rows = await prisma.jobResumeTailor.findMany({
    where: { userId, sourceProfileId },
    select: {
      jobTrackerEntry: {
        select: {
          id: true,
          title: true,
          company: true,
          status: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.jobTrackerEntry.id,
    title: row.jobTrackerEntry.title,
    company: row.jobTrackerEntry.company,
    status: row.jobTrackerEntry.status,
  }));
}

export async function countJobsDependingOnProfile(
  userId: string,
  sourceProfileId: string,
): Promise<number> {
  return prisma.jobResumeTailor.count({
    where: { userId, sourceProfileId },
  });
}

function toRecord(row: {
  id: string;
  jobTrackerEntryId: string;
  sourceProfileId: string;
  overrides: unknown;
  changedSections: string[];
  enhanceTraceId: string | null;
  coverLetter?: string | null;
  resumeLatex?: string | null;
  coverLetterLatex?: string | null;
  updatedAt: Date;
}): JobResumeTailorRecord {
  return {
    id: row.id,
    jobTrackerEntryId: row.jobTrackerEntryId,
    sourceProfileId: row.sourceProfileId,
    overrides: parseJobResumeOverrides(row.overrides),
    changedSections: row.changedSections as StudioEditorSectionId[],
    enhanceTraceId: row.enhanceTraceId,
    coverLetter: row.coverLetter ?? null,
    resumeLatex: row.resumeLatex ?? null,
    coverLetterLatex: row.coverLetterLatex ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateJobReviewDocuments(
  userId: string,
  jobTrackerEntryId: string,
  patch: {
    coverLetter?: string | null;
    resumeLatex?: string | null;
    coverLetterLatex?: string | null;
  },
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await prisma.jobResumeTailor.updateMany({
    where: { jobTrackerEntryId, userId },
    data: {
      ...(patch.coverLetter !== undefined ? { coverLetter: patch.coverLetter } : {}),
      ...(patch.resumeLatex !== undefined ? { resumeLatex: patch.resumeLatex } : {}),
      ...(patch.coverLetterLatex !== undefined ? { coverLetterLatex: patch.coverLetterLatex } : {}),
    },
  });

  if (result.count === 0) {
    return { success: false, error: "No tailored resume for this job yet" };
  }
  return { success: true };
}

export async function ensureJobResumeTailorRow(
  userId: string,
  jobTrackerEntryId: string,
): Promise<JobResumeTailorRecord | null> {
  return getJobResumeTailorForEntry(userId, jobTrackerEntryId);
}
