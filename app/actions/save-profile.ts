"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sanitizeEmail,
  sanitizeOptionalInt,
  sanitizeRequiredString,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/profile/sanitize";
import {
  upsertProfileArchitecture,
} from "@/lib/profile/resume-profile-core";
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
  minSalary?: number | null;
  workMode?: string | null;
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

type ExperienceRow = Pick<
  Prisma.ExperienceCreateManyInput,
  "title" | "company" | "sortOrder"
>;
type ProjectRow = Pick<
  Prisma.ProjectCreateManyInput,
  "name" | "description" | "sortOrder"
>;
type EducationRow = Pick<
  Prisma.EducationCreateManyInput,
  "institution" | "degree" | "field" | "startDate" | "endDate" | "sortOrder"
>;

function sanitizeExperiences(
  experiences: RefineryExperienceField[] | undefined,
): ExperienceRow[] {
  if (!Array.isArray(experiences)) {
    return [];
  }

  const rows: ExperienceRow[] = [];

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
): ProjectRow[] {
  if (!Array.isArray(projects)) {
    return [];
  }

  const rows: ProjectRow[] = [];

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
): EducationRow[] {
  if (!Array.isArray(educations)) {
    return [];
  }

  const rows: EducationRow[] = [];

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

  return {
    firstName: sanitizeString(firstName, 80),
    lastName: sanitizeString(lastName, 80),
    displayName: joinProfileName(firstName, lastName),
    email,
    phone: sanitizeString(input.phone, 40),
    city,
    country,
    targetTitle: sanitizeString(input.targetTitle, 160),
    minSalary: sanitizeOptionalInt(input.minSalary, 0, 1_000_000),
    workMode: sanitizeString(input.workMode, 40),
    summary: sanitizeString(input.summary, 8000),
    resumeRawText: sanitizeString(input.resumeRawText, 200_000),
    coreCompetencies: sanitizeStringArray(input.coreCompetencies),
    skills: sanitizeStringArray(input.technicalSkills),
    experiences: sanitizeExperiences(input.experiences),
    projects: sanitizeProjects(input.projects),
    educations: sanitizeEducations(input.educations),
    engineParsedData: {
      email,
      phone: sanitizeString(input.phone, 40),
      linkedIn: sanitizeString(input.linkedIn, 500),
      coreCompetencies: sanitizeStringArray(input.coreCompetencies),
      skills: sanitizeStringArray(input.technicalSkills),
      experiences: sanitizeExperiences(input.experiences),
      projects: sanitizeProjects(input.projects),
      educations: sanitizeEducations(input.educations),
    } satisfies Prisma.InputJsonObject,
  };
}

/**
 * Persist refinery profile data: essentials, competencies, experience, projects, and education.
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

      if (existingDefault) {
        profile = await tx.profile.update({
          where: { id: existingDefault.id },
          data: {
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
            city: payload.city,
            country: payload.country,
            targetTitle: payload.targetTitle,
            minSalary: payload.minSalary,
            workMode: payload.workMode,
            summary: payload.summary,
            resumeRawText: payload.resumeRawText,
            coreCompetencies: payload.coreCompetencies,
            skills: payload.skills,
            isDefault: true,
          },
        });
      } else {
        await tx.profile.updateMany({ where: { userId }, data: { isDefault: false } });
        profile = await tx.profile.create({
          data: {
            userId,
            isDefault: true,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
            city: payload.city,
            country: payload.country,
            targetTitle: payload.targetTitle,
            minSalary: payload.minSalary,
            workMode: payload.workMode,
            summary: payload.summary,
            resumeRawText: payload.resumeRawText,
            coreCompetencies: payload.coreCompetencies,
            skills: payload.skills,
          },
        });
      }

      await tx.experience.deleteMany({ where: { profileId: profile.id } });
      await tx.project.deleteMany({ where: { profileId: profile.id } });
      await tx.education.deleteMany({ where: { profileId: profile.id } });

      if (payload.experiences.length > 0) {
        await tx.experience.createMany({
          data: payload.experiences.map((row) => ({
            ...row,
            profileId: profile.id,
          })),
        });
      }

      if (payload.projects.length > 0) {
        await tx.project.createMany({
          data: payload.projects.map((row) => ({
            ...row,
            profileId: profile.id,
          })),
        });
      }

      if (payload.educations.length > 0) {
        await tx.education.createMany({
          data: payload.educations.map((row) => ({
            ...row,
            profileId: profile.id,
          })),
        });
      }

      await upsertProfileArchitecture(
        tx,
        profile.id,
        {
          content: payload.engineParsedData,
          ...(payload.targetTitle ? { targetRole: payload.targetTitle } : {}),
        },
        payload.targetTitle,
      );

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
