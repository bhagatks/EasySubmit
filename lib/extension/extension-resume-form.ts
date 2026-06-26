import {
  applyResumeDetailDraftToForm,
  mergedFormToResumeDetailDraft,
  type ResumeDetailDraft,
} from "@/src/shared/extension/resume-detail-edit";
import { extractJobResumeOverrides } from "@/lib/profile/job-resume-overrides";
import {
  getMergedResumeForJob,
  upsertJobResumeTailor,
} from "@/lib/profile/job-resume-tailor";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import { prisma } from "@/lib/prisma";

export type ExtensionResumeFormResult =
  | { success: true; draft: ResumeDetailDraft }
  | { success: false; error: string; status: number };

export type ExtensionResumeFormSaveResult =
  | { success: true }
  | { success: false; error: string; status: number };

export async function getExtensionResumeDetailDraft(
  userId: string,
  jobId: string,
): Promise<ExtensionResumeFormResult> {
  const merged = await getMergedResumeForJob(userId, jobId);
  if (!merged.success) {
    return { success: false, error: merged.error, status: 422 };
  }

  return {
    success: true,
    draft: mergedFormToResumeDetailDraft(merged.form, merged.targetTitle),
  };
}

export async function saveExtensionResumeDetailDraft(
  userId: string,
  jobId: string,
  draft: ResumeDetailDraft,
): Promise<ExtensionResumeFormSaveResult> {
  const tailor = await prisma.jobResumeTailor.findFirst({
    where: { jobTrackerEntryId: jobId, userId },
  });
  if (!tailor) {
    return { success: false, error: "No tailored resume for this job yet", status: 422 };
  }

  const source = await findProfileForUser(userId, tailor.sourceProfileId);
  if (!source) {
    return { success: false, error: "Source resume profile not found", status: 422 };
  }

  const merged = await getMergedResumeForJob(userId, jobId);
  if (!merged.success) {
    return { success: false, error: merged.error, status: 422 };
  }

  const baseForm = hubRefineryFormFromProfile(source);
  const baseTargetTitle = targetTitleFromProfile(source);
  const nextForm = applyResumeDetailDraftToForm(merged.form, draft);
  const { overrides, changedSections } = extractJobResumeOverrides(
    baseForm,
    nextForm,
    baseTargetTitle,
    draft.targetTitle.trim(),
  );

  try {
    await upsertJobResumeTailor({
      jobTrackerEntryId: jobId,
      userId,
      sourceProfileId: tailor.sourceProfileId,
      overrides,
      changedSections,
      enhanceTraceId: tailor.enhanceTraceId,
    });
  } catch {
    return { success: false, error: "Failed to save tailored resume", status: 500 };
  }

  return { success: true };
}
