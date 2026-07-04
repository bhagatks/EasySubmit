"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  countUserProfiles,
  findDefaultProfile,
  findProfileForUser,
  profileEmailForUser,
  setDefaultProfileForUser,
} from "@/lib/profile/resume-profile-core";
import {
  hubRefineryFormFromProfile,
  studioSkillsFromForm,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { buildResumeProfileStudioPersistPayload } from "@/lib/profile/studio-profile-persist";
import { countJobsDependingOnProfile } from "@/lib/profile/job-resume-tailor";
import { checkUserCanCreateResumeProfile, getResumeProfilesConfig } from "@/lib/profile/resume-profile-limit";
import { sanitizeString } from "@/lib/profile/sanitize";
import { canPersistProfileStudio, profileStudioPersistErrors } from "@/lib/profile/profile-studio-persist";
import { validateResume } from "@/lib/resume/validation";

export type ResumeProfileListItem = {
  id: string;
  targetTitle: string | null;
  firstName: string | null;
  lastName: string | null;
  isDefault: boolean;
  updatedAt: string;
};

export type ListResumeProfilesResult =
  | {
      success: true;
      profiles: ResumeProfileListItem[];
      canDelete: boolean;
      profileCount: number;
      maxProfiles: number;
      canCreate: boolean;
    }
  | { success: false; error: string };

export async function listResumeProfiles(): Promise<ListResumeProfilesResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const rows = await prisma.profile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      targetTitle: true,
      firstName: true,
      lastName: true,
      isDefault: true,
      updatedAt: true,
    },
  });

  const { maxProfilesPerCustomer: maxProfiles } = await getResumeProfilesConfig();
  const profileCount = rows.length;

  return {
    success: true,
    profiles: rows.map((row) => ({
      id: row.id,
      targetTitle: row.targetTitle,
      firstName: row.firstName,
      lastName: row.lastName,
      isDefault: row.isDefault,
      updatedAt: row.updatedAt.toISOString(),
    })),
    canDelete: profileCount > 1,
    profileCount,
    maxProfiles,
    canCreate: profileCount < maxProfiles,
  };
}

export type GetResumeProfileStudioResult =
  | {
      success: true;
      profileId: string;
      targetTitle: string;
      form: HubRefineryForm;
      rawResumeText: string | null;
      isDefault: boolean;
      canDelete: boolean;
    }
  | { success: false; error: string };

export async function getResumeProfileStudio(
  profileId: string,
): Promise<GetResumeProfileStudioResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const profile = await findProfileForUser(userId, profileId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const total = await countUserProfiles(userId);

  return {
    success: true,
    profileId: profile.id,
    targetTitle: targetTitleFromProfile(profile),
    form: hubRefineryFormFromProfile(profile),
    rawResumeText: profile.resumeRawText,
    isDefault: profile.isDefault,
    canDelete: total > 1 && !profile.isDefault,
  };
}

export type CreateResumeProfileInput = {
  copyFromDefault?: boolean;
};

export type CreateResumeProfileResult =
  | { success: true; profileId: string }
  | { success: false; error: string };

export async function createResumeProfile(
  input: CreateResumeProfileInput = {},
): Promise<CreateResumeProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const sessionEmail = session?.user?.email;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const copyFromDefault = input.copyFromDefault ?? false;
  const defaultProfile = await findDefaultProfile(userId);

  if (copyFromDefault && !defaultProfile) {
    return { success: false, error: "No default profile to copy from" };
  }

  try {
    const { maxProfilesPerCustomer: maxProfiles } = await getResumeProfilesConfig();
    const profileId = await prisma.$transaction(
      async (tx) => {
        const limit = await checkUserCanCreateResumeProfile(userId, tx, maxProfiles);
        if (!limit.ok) {
          throw new Error(limit.error);
        }

        if (copyFromDefault && defaultProfile) {
          const cloned = await tx.profile.create({
            data: {
              userId,
              isDefault: false,
              email: defaultProfile.email,
              firstName: defaultProfile.firstName,
              lastName: defaultProfile.lastName,
              phone: defaultProfile.phone,
              city: defaultProfile.city,
              country: defaultProfile.country,
              targetTitle: null,
              summary: defaultProfile.summary,
              skills: [...defaultProfile.skills],
              resumeRawText: defaultProfile.resumeRawText,
              content: defaultProfile.content as Prisma.InputJsonValue,
              calibrationScore: defaultProfile.calibrationScore,
            },
          });

          return cloned.id;
        }

        const email =
          defaultProfile?.email ??
          profileEmailForUser(userId, sessionEmail);

        const created = await tx.profile.create({
          data: {
            userId,
            isDefault: false,
            email,
            firstName: defaultProfile?.firstName,
            lastName: defaultProfile?.lastName,
          },
        });

        return created.id;
      },
      { timeout: 15_000 },
    );

    revalidatePath("/dashboard/resume-profiles");

    return { success: true, profileId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create profile";
    return { success: false, error: message };
  }
}

export type CreateResumeProfileFromParsedInput = {
  form: HubRefineryForm;
  rawResumeText: string;
};

export async function createResumeProfileFromParsed(
  input: CreateResumeProfileFromParsedInput,
): Promise<CreateResumeProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const sessionEmail = session?.user?.email;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const form = input.form;
  const skills = studioSkillsFromForm(form);
  const defaultProfile = await findDefaultProfile(userId);
  const fallbackEmail =
    defaultProfile?.email ?? profileEmailForUser(userId, sessionEmail);
  const payload = buildResumeProfileStudioPersistPayload({
    form,
    targetTitle: "",
    skills,
    fallbackEmail,
  });

  try {
    const { maxProfilesPerCustomer: maxProfiles } = await getResumeProfilesConfig();
    const profileId = await prisma.$transaction(
      async (tx) => {
        const limit = await checkUserCanCreateResumeProfile(userId, tx, maxProfiles);
        if (!limit.ok) {
          throw new Error(limit.error);
        }

        const created = await tx.profile.create({
          data: {
            userId,
            isDefault: false,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
            city: payload.city,
            country: payload.country,
            targetTitle: null,
            summary: payload.summary,
            skills: payload.skills,
            resumeRawText: input.rawResumeText.trim() || null,
            content: payload.content,
          },
        });

        return created.id;
      },
      { timeout: 15_000 },
    );

    revalidatePath("/dashboard/resume-profiles");

    return { success: true, profileId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create profile";
    return { success: false, error: message };
  }
}

export type SaveResumeProfileStudioInput = {
  profileId: string;
  targetTitle: string;
  form: HubRefineryForm;
};

export type SaveResumeProfileStudioResult =
  | { success: true; profileId: string }
  | { success: false; error: string };

export async function saveResumeProfileStudio(
  input: SaveResumeProfileStudioInput,
): Promise<SaveResumeProfileStudioResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const targetTitle = sanitizeString(input.targetTitle, 160);
  if (!targetTitle) {
    return { success: false, error: "Target role is required to name this profile" };
  }

  const skills = studioSkillsFromForm(input.form);
  const persistErrors = profileStudioPersistErrors(input.form, targetTitle, skills);
  if (persistErrors.length > 0) {
    return {
      success: false,
      error: persistErrors.join(". "),
    };
  }

  const profile = await findProfileForUser(userId, input.profileId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  if (!canPersistProfileStudio(input.form, targetTitle, skills)) {
    return { success: false, error: "Profile is not ready to save." };
  }

  // Full resume validation is advisory for export — not a persist blocker.
  void validateResume(input.form, targetTitle, { summaryRequired: false });
  const payload = buildResumeProfileStudioPersistPayload({
    form: input.form,
    targetTitle,
    skills,
    fallbackEmail: profile.email,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: payload,
      });
    });

    revalidatePath("/dashboard/resume-profiles");
    revalidatePath(`/dashboard/resume-profiles/${profile.id}/edit`);

    return { success: true, profileId: profile.id };
  } catch {
    return { success: false, error: "Failed to save profile" };
  }
}

export type DeleteResumeProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteResumeProfile(
  profileId: string,
): Promise<DeleteResumeProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const total = await countUserProfiles(userId);
  if (total <= 1) {
    return { success: false, error: "You must keep at least one resume profile" };
  }

  const profile = await findProfileForUser(userId, profileId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  if (profile.isDefault) {
    return {
      success: false,
      error: "Set another profile as default before deleting this one",
    };
  }

  const dependentCount = await countJobsDependingOnProfile(userId, profileId);
  if (dependentCount > 0) {
    return {
      success: false,
      error: `This profile is the base resume for ${dependentCount} job application${dependentCount === 1 ? "" : "s"}. Open those jobs in Job Tracker before deleting.`,
    };
  }

  await prisma.profile.delete({ where: { id: profile.id } });

  revalidatePath("/dashboard/resume-profiles");

  return { success: true };
}

export type SetDefaultResumeProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function setDefaultResumeProfile(
  profileId: string,
): Promise<SetDefaultResumeProfileResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const ok = await setDefaultProfileForUser(userId, profileId);
  if (!ok) {
    return { success: false, error: "Profile not found" };
  }

  revalidatePath("/dashboard/resume-profiles");

  return { success: true };
}
