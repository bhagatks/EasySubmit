"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { resumeProfileDisplayLabel } from "@/lib/extension/resume-profiles";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { extractJobResumeOverrides } from "@/lib/profile/job-resume-overrides";
import {
  getMergedResumeForJob,
  listJobsDependingOnProfile,
  upsertJobResumeTailor,
} from "@/lib/profile/job-resume-tailor";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { prisma } from "@/lib/prisma";
import { validateResume } from "@/lib/resume/validation";

export type ProfileDependentJobSummary = {
  id: string;
  title: string;
  company: string | null;
  status: string;
};

export type GetJobResumeStudioResult =
  | {
      success: true;
      jobId: string;
      jobTitle: string;
      sourceProfileId: string;
      sourceProfileName: string;
      targetTitle: string;
      form: HubRefineryForm;
      rawResumeText: string | null;
    }
  | { success: false; error: string };

export async function getJobResumeStudio(jobId: string): Promise<GetJobResumeStudioResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Sign in required" };

  const job = await prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: { id: true, title: true },
  });
  if (!job) return { success: false, error: "Job not found" };

  const merged = await getMergedResumeForJob(userId, jobId);
  if (!merged.success) return { success: false, error: merged.error };

  const source = await findProfileForUser(userId, merged.sourceProfileId);

  return {
    success: true,
    jobId: job.id,
    jobTitle: job.title,
    sourceProfileId: merged.sourceProfileId,
    sourceProfileName: source ? resumeProfileDisplayLabel(source) : "Resume profile",
    targetTitle: merged.targetTitle,
    form: merged.form,
    rawResumeText: merged.rawResumeText,
  };
}

export type SaveJobResumeStudioInput = {
  jobId: string;
  targetTitle: string;
  form: HubRefineryForm;
};

export type SaveJobResumeStudioResult =
  | { success: true }
  | { success: false; error: string };

export async function saveJobResumeStudio(
  input: SaveJobResumeStudioInput,
): Promise<SaveJobResumeStudioResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Sign in required" };

  const gate = validateResume(input.form, input.targetTitle ?? "");
  if (!gate.canFinalize) {
    const errors = [
      ...gate.header.issues,
      ...gate.summary.issues,
      ...gate.skills.issues,
      ...gate.experience.issues,
    ]
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);
    return {
      success: false,
      error: `Resume has validation errors: ${errors.join(". ")}`,
    };
  }

  const tailor = await prisma.jobResumeTailor.findFirst({
    where: { jobTrackerEntryId: input.jobId, userId },
  });
  if (!tailor) {
    return { success: false, error: "No tailored resume for this job yet" };
  }

  const source = await findProfileForUser(userId, tailor.sourceProfileId);
  if (!source) {
    return { success: false, error: "Source resume profile not found" };
  }

  const baseForm = hubRefineryFormFromProfile(source);
  const baseTargetTitle = targetTitleFromProfile(source);
  const { overrides, changedSections } = extractJobResumeOverrides(
    baseForm,
    input.form,
    baseTargetTitle,
    input.targetTitle.trim(),
  );

  try {
    await upsertJobResumeTailor({
      jobTrackerEntryId: input.jobId,
      userId,
      sourceProfileId: tailor.sourceProfileId,
      overrides,
      changedSections,
      enhanceTraceId: tailor.enhanceTraceId,
    });
  } catch {
    return { success: false, error: "Failed to save tailored resume" };
  }

  revalidatePath("/dashboard/job-tracker");
  revalidatePath(`/dashboard/job-tracker/${input.jobId}/resume`);

  return { success: true };
}

export async function getProfileDependentJobs(
  profileId: string,
): Promise<{ success: true; jobs: ProfileDependentJobSummary[] } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Sign in required" };

  const profile = await findProfileForUser(userId, profileId);
  if (!profile) return { success: false, error: "Profile not found" };

  const jobs = await listJobsDependingOnProfile(userId, profileId);
  return { success: true, jobs };
}
