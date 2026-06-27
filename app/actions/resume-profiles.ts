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
  hubFormToProfileContent,
  hubRefineryFormFromProfile,
  studioSkillsFromForm,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { countJobsDependingOnProfile } from "@/lib/profile/job-resume-tailor";
import { checkUserCanCreateResumeProfile, getResumeProfilesConfig } from "@/lib/profile/resume-profile-limit";
import { sanitizeString } from "@/lib/profile/sanitize";
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
    const profileId = await prisma.$transaction(async (tx) => {
      const limit = await checkUserCanCreateResumeProfile(userId, tx);
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
    });

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
  const { city, country } = parseCityState(form.cityState);
  const defaultProfile = await findDefaultProfile(userId);

  const email =
    sanitizeString(form.email, 200) ||
    defaultProfile?.email ||
    profileEmailForUser(userId, sessionEmail);

  try {
    const profileId = await prisma.$transaction(async (tx) => {
      const limit = await checkUserCanCreateResumeProfile(userId, tx);
      if (!limit.ok) {
        throw new Error(limit.error);
      }

      const created = await tx.profile.create({
        data: {
          userId,
          isDefault: false,
          email,
          firstName: sanitizeString(form.firstName, 80) || null,
          lastName: sanitizeString(form.lastName, 80) || null,
          phone: sanitizeString(form.phone, 40) || null,
          city: sanitizeString(city, 120) || null,
          country: sanitizeString(country, 120) || null,
          targetTitle: null,
          summary: sanitizeString(form.professionalSummary, 8000) || null,
          skills,
          resumeRawText: input.rawResumeText.trim() || null,
          content: hubFormToProfileContent(form, skills) as Prisma.InputJsonValue,
        },
      });

      return created.id;
    });

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

function parseCityState(cityState: string): { city: string; country: string } {
  const trimmed = cityState.trim();
  if (!trimmed) return { city: "", country: "" };

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(", ") };
  }

  return { city: trimmed, country: "" };
}

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

  const profile = await findProfileForUser(userId, input.profileId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const form = input.form;
  const skills = studioSkillsFromForm(form);
  const { city, country } = parseCityState(form.cityState);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: {
          firstName: sanitizeString(form.firstName, 80) || null,
          lastName: sanitizeString(form.lastName, 80) || null,
          email: sanitizeString(form.email, 200) || profile.email,
          phone: sanitizeString(form.phone, 40) || null,
          city: sanitizeString(city, 120) || null,
          country: sanitizeString(country, 120) || null,
          targetTitle,
          summary: sanitizeString(form.professionalSummary, 8000) || null,
          skills,
          content: hubFormToProfileContent(form, skills) as Prisma.InputJsonValue,
        },
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
