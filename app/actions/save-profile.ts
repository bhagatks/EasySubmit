"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sanitizeEmail,
  sanitizeRequiredString,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/profile/sanitize";
import { parseProfileName, joinProfileName } from "@/lib/profile/name";
import { splitLocationField } from "@/lib/resume/extractSections";
import type {
  RefineryExperienceField,
  RefineryFormValues,
  RefineryProjectField,
} from "@/lib/resume/refineryDefaults";

export type SaveProfileEducationInput = {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
};

export type SaveProfileInput = RefineryFormValues & {
  targetTitle?: string | null;
  summary?: string | null;
  resumeRawText?: string | null;
  linkedIn?: string | null;
  educations?: SaveProfileEducationInput[];
};

export type SaveProfileSuccess = {
  success: true;
  profileId: string;
  onboardingStep: 4;
};

export type SaveProfileError = {
  success: false;
  error: string;
};

function sanitizeExperiences(
  experiences: RefineryExperienceField[] | undefined,
): Array<{ title: string; company: string; sortOrder: number }> {
  if (!Array.isArray(experiences)) {
    return [];
  }

  const rows: Array<{ title: string; company: string; sortOrder: number }> = [];

  experiences.forEach((entry, index) => {
    const title = sanitizeRequiredString(entry?.title, 160);
    const company = sanitizeRequiredString(entry?.company, 160);

    if (!title && !company) {
      return;
    }

    rows.push({
      title: title || "Untitled role",
      company: company || "Unknown company",
      sortOrder: index,
    });
  });

  return rows;
}

function sanitizeProjects(
  projects: RefineryProjectField[] | undefined,
): Array<{ name: string; description: string | null; sortOrder: number }> {
  if (!Array.isArray(projects)) {
    return [];
  }

  const rows: Array<{ name: string; description: string | null; sortOrder: number }> = [];

  projects.forEach((entry, index) => {
    const name = sanitizeRequiredString(entry?.name, 160);
    if (!name) {
      return;
    }

    rows.push({
      name,
      description: sanitizeString(entry?.description, 4000),
      sortOrder: index,
    });
  });

  return rows;
}

function sanitizeEducations(
  educations: SaveProfileEducationInput[] | undefined,
): Array<{
  institution: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
}> {
  if (!Array.isArray(educations)) {
    return [];
  }

  const rows: Array<{
    institution: string;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    sortOrder: number;
  }> = [];

  educations.forEach((entry, index) => {
    const institution = sanitizeRequiredString(entry?.institution, 200);
    if (!institution) {
      return;
    }

    rows.push({
      institution,
      degree: sanitizeString(entry?.degree, 160),
      field: sanitizeString(entry?.field, 160),
      startDate: sanitizeString(entry?.startDate, 40),
      endDate: sanitizeString(entry?.endDate, 40),
      sortOrder: index,
    });
  });

  return rows;
}

function sanitizeProfilePayload(input: SaveProfileInput) {
  const email = sanitizeEmail(input.email);
  if (!email) {
    throw new Error("A valid email is required");
  }

  const locationFromField = sanitizeString(input.location, 200);
  const splitLocation = locationFromField
    ? splitLocationField(locationFromField)
    : { city: "", country: "" };

  const city = sanitizeString(splitLocation.city, 120);
  const country = sanitizeString(splitLocation.country, 120);
  const { firstName, lastName } = parseProfileName(sanitizeString(input.fullName, 160));
  const skills = sanitizeStringArray(input.technicalSkills);

  return {
    firstName: sanitizeString(firstName, 80),
    lastName: sanitizeString(lastName, 80),
    email,
    phone: sanitizeString(input.phone, 40),
    city,
    country,
    targetTitle: sanitizeString(input.targetTitle, 160),
    summary: sanitizeString(input.summary, 8000),
    resumeRawText: sanitizeString(input.resumeRawText, 200_000),
    skills,
    content: {
      email,
      phone: sanitizeString(input.phone, 40),
      linkedIn: sanitizeString(input.linkedIn, 500),
      skills,
      experiences: sanitizeExperiences(input.experiences),
      projects: sanitizeProjects(input.projects),
      educations: sanitizeEducations(input.educations),
    } satisfies Prisma.InputJsonObject,
  };
}

/**
 * Persist refinery profile data to the default profile row (legacy wizard path).
 */
export async function saveProfile(
  input: SaveProfileInput,
): Promise<SaveProfileSuccess | SaveProfileError> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const payload = sanitizeProfilePayload(input);

    const profileId = await prisma.$transaction(async (tx) => {
      const existingDefault = await tx.profile.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      });

      let profile: { id: string };

      const profileData = {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        city: payload.city,
        country: payload.country,
        targetTitle: payload.targetTitle,
        summary: payload.summary,
        resumeRawText: payload.resumeRawText,
        skills: payload.skills,
        content: payload.content,
      };

      if (existingDefault) {
        profile = await tx.profile.update({
          where: { id: existingDefault.id },
          data: {
            ...profileData,
            isDefault: true,
          },
        });
      } else {
        await tx.profile.updateMany({ where: { userId }, data: { isDefault: false } });
        profile = await tx.profile.create({
          data: {
            userId,
            isDefault: true,
            ...profileData,
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingStep: 4,
        },
      });

      return profile.id;
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

    return {
      success: true,
      profileId,
      onboardingStep: 4,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save profile";
    return { success: false, error: message };
  }
}
