import type { Prisma } from "@/lib/generated/prisma/client";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  findDefaultProfile,
  findProfileForUser,
  type ResumeProfile,
} from "@/lib/profile/resume-profile-core";
import { sanitizeString } from "@/lib/profile/sanitize";
import { checkUserCanCreateResumeProfile } from "@/lib/profile/resume-profile-limit";
import { hubRefineryFormFromProfile } from "@/lib/profile/studio-form-db";
import { prisma } from "@/lib/prisma";

export type CopyProfileForJobInput = {
  /** Extension card selection; falls back to default profile. */
  sourceProfileId?: string | null;
  jobTitle: string;
};

export type CopyProfileForJobSuccess = {
  success: true;
  profileId: string;
  sourceProfileId: string;
  targetTitle: string;
  form: HubRefineryForm;
  rawResumeText: string | null;
};

export type CopyProfileForJobFailure = {
  success: false;
  error: string;
  code: "no_source_profile" | "invalid_title" | "profile_limit_reached";
};

export type CopyProfileForJobResult = CopyProfileForJobSuccess | CopyProfileForJobFailure;

/** Resolve the resume profile to tailor from (explicit pick or user default). */
export async function resolveSourceProfileForJob(
  userId: string,
  sourceProfileId?: string | null,
): Promise<ResumeProfile | null> {
  const explicit = sourceProfileId?.trim();
  if (explicit) {
    return findProfileForUser(userId, explicit);
  }
  return findDefaultProfile(userId);
}

/**
 * Clone a source profile into a job-specific profile (does not mutate default).
 * Sets `targetTitle` to the scraped job title for Studio labeling.
 */
export async function copySourceProfileForJob(
  userId: string,
  input: CopyProfileForJobInput,
): Promise<CopyProfileForJobResult> {
  const targetTitle = sanitizeString(input.jobTitle, 160);
  if (!targetTitle) {
    return {
      success: false,
      error: "Job title is required to create a tailored profile",
      code: "invalid_title",
    };
  }

  const source = await resolveSourceProfileForJob(userId, input.sourceProfileId);
  if (!source) {
    return {
      success: false,
      error: "No resume profile to copy from",
      code: "no_source_profile",
    };
  }

  const limit = await checkUserCanCreateResumeProfile(userId);
  if (!limit.ok) {
    return {
      success: false,
      error: limit.error,
      code: "profile_limit_reached",
    };
  }

  const cloned = await prisma.profile.create({
    data: {
      userId,
      isDefault: false,
      email: source.email,
      firstName: source.firstName,
      lastName: source.lastName,
      phone: source.phone,
      city: source.city,
      country: source.country,
      targetTitle,
      summary: source.summary,
      skills: [...source.skills],
      resumeRawText: source.resumeRawText,
      content: source.content as Prisma.InputJsonValue,
      calibrationScore: source.calibrationScore,
    },
  });

  return {
    success: true,
    profileId: cloned.id,
    sourceProfileId: source.id,
    targetTitle,
    form: hubRefineryFormFromProfile(cloned),
    rawResumeText: cloned.resumeRawText,
  };
}
