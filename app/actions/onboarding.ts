"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProfileName } from "@/lib/profile/name";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { parseDateRangeString } from "@/lib/resume/dates";
import { collectValidationErrorMessages, validateResume } from "@/lib/resume/validation";
import {
  profileContentPatch,
  profileEmailForUser,
} from "@/lib/profile/resume-profile-core";
import type { Prisma } from "@/lib/generated/prisma/client";

export type CompleteOnboardingInput = {
  targetTitle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** @deprecated Prefer firstName + lastName */
  fullName?: string | null;
  email?: string | null;
  resumeRawText?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  summary?: string | null;
  skills?: string[];
  parsedData?: Prisma.InputJsonValue;
  calibrationScore?: number;
};

function normalizeFormData(formData: unknown): Record<string, unknown> {
  const payload =
    typeof formData === "object" && formData !== null
      ? { ...(formData as Record<string, unknown>) }
      : {};

  if (payload.targetTitle === undefined) {
    if (payload.selectedRole !== undefined) {
      payload.targetTitle = payload.selectedRole;
    } else if (payload.jobTitle !== undefined) {
      payload.targetTitle = payload.jobTitle;
    } else if (payload.targetJobTitle !== undefined) {
      payload.targetTitle = payload.targetJobTitle;
    }
  }

  return payload;
}

function buildProfilePatch(data: Record<string, unknown>): Prisma.ProfileUpdateInput {
  const patch: Prisma.ProfileUpdateInput = {
    ...profileContentPatch(data),
  };

  if (data.targetTitle !== undefined) {
    patch.targetTitle = data.targetTitle as string | null;
  }
  if (data.resumeRawText !== undefined) {
    patch.resumeRawText = data.resumeRawText as string | null;
  }
  if (data.firstName !== undefined) {
    patch.firstName = data.firstName as string | null;
  }
  if (data.lastName !== undefined) {
    patch.lastName = data.lastName as string | null;
  }
  if (
    data.fullName !== undefined &&
    data.firstName === undefined &&
    data.lastName === undefined
  ) {
    const parsed = parseProfileName(data.fullName as string | null);
    patch.firstName = parsed.firstName || null;
    patch.lastName = parsed.lastName || null;
  }
  if (data.phone !== undefined) {
    patch.phone = data.phone as string | null;
  }
  if (data.email !== undefined) {
    patch.email = data.email as string;
  }
  if (data.city !== undefined) {
    patch.city = data.city as string | null;
  }
  if (data.country !== undefined) {
    patch.country = data.country as string | null;
  }
  if (data.summary !== undefined) {
    patch.summary = data.summary as string | null;
  }
  if (data.skills !== undefined) {
    patch.skills = data.skills as string[];
  }

  return patch;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function profileEmailForUserId(userId: string, email?: string | null): string {
  return profileEmailForUser(userId, email);
}

async function upsertDefaultUserProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string | null | undefined,
  profilePatch: Prisma.ProfileUpdateInput,
): Promise<string> {
  const profileEmail =
    (profilePatch.email as string | undefined) ??
    profileEmailForUserId(userId, email);

  const existingDefault = await tx.profile.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });

  const createData: Prisma.ProfileUncheckedCreateInput = {
    userId,
    isDefault: true,
    email: profileEmail,
    targetTitle: profilePatch.targetTitle as string | null | undefined,
    resumeRawText: profilePatch.resumeRawText as string | null | undefined,
    firstName: profilePatch.firstName as string | null | undefined,
    lastName: profilePatch.lastName as string | null | undefined,
    phone: profilePatch.phone as string | null | undefined,
    city: profilePatch.city as string | null | undefined,
    country: profilePatch.country as string | null | undefined,
    summary: profilePatch.summary as string | null | undefined,
    skills: profilePatch.skills as string[] | undefined,
    content: (profilePatch.content as Prisma.InputJsonValue | undefined) ?? {},
    calibrationScore:
      (profilePatch.calibrationScore as number | undefined) ?? 0,
  };

  if (existingDefault) {
    await tx.profile.update({
      where: { id: existingDefault.id },
      data: {
        ...(email || profilePatch.email
          ? { email: (profilePatch.email as string | undefined) ?? profileEmail }
          : {}),
        ...profilePatch,
        isDefault: true,
      },
    });
    return existingDefault.id;
  }

  const anyProfile = await tx.profile.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (anyProfile) {
    await tx.profile.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.profile.update({
      where: { id: anyProfile.id },
      data: {
        ...(email || profilePatch.email
          ? { email: (profilePatch.email as string | undefined) ?? profileEmail }
          : {}),
        ...profilePatch,
        isDefault: true,
      },
    });
    return anyProfile.id;
  }

  const created = await tx.profile.create({ data: createData });
  return created.id;
}

export async function uploadResumeFuel(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const skipped = formData.get("skipped") === "true";

  if (!skipped) {
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      throw new Error("Resume file is required");
    }

    if (!isPdfFile(file)) {
      throw new Error("PDF only");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: 2 },
    });
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true, onboardingStep: 2 };
}

function buildGateForm(data: CompleteOnboardingInput): HubRefineryForm {
  type ParsedExperience = {
    title?: string;
    company?: string;
    location?: string;
    dateRange?: string;
    bullets?: string[];
  };

  const parsedRoot =
    typeof data.parsedData === "object" && data.parsedData !== null
      ? (data.parsedData as { experiences?: ParsedExperience[] })
      : null;
  const parsedExperiences = Array.isArray(parsedRoot?.experiences)
    ? parsedRoot.experiences
    : [];

  return {
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    cityState: [data.city, data.country].filter(Boolean).join(", "),
    linkedIn: "",
    professionalSummary: data.summary ?? "",
    skillsText: (data.skills ?? []).join(", "),
    experience: parsedExperiences.map((entry, index) => {
      const range = parseDateRangeString(entry.dateRange);
      return {
        id: `exp-${index}`,
        title: entry.title ?? "",
        company: entry.company ?? "",
        location: entry.location ?? "",
        startMonth: range.start.month,
        startYear: range.start.year,
        endMonth: range.end.month,
        endYear: range.end.year,
        bullets: (entry.bullets ?? []).join("\n"),
        hidden: false,
      };
    }),
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    customSections: [],
  };
}

export async function completeOnboarding(data: CompleteOnboardingInput = {}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const gate = validateResume(buildGateForm(data), data.targetTitle ?? "", {
    summaryRequired: false,
  });
  if (!gate.canFinalize) {
    const errors = collectValidationErrorMessages(gate);

    throw new Error(
      errors.join("\n") || "Resume validation failed",
    );
  }

  const userId = session.user.id;
  const payload = normalizeFormData(data);
  const profilePatch = buildProfilePatch(payload);

  await prisma.$transaction(async (tx) => {
    await upsertDefaultUserProfile(
      tx,
      userId,
      session.user.email,
      profilePatch,
    );
  });

  return { success: true as const, profileSaved: true as const };
}

/** Marks onboarding complete after the synthesis animation — keeps step at 3 until then. */
export async function advanceOnboardingComplete() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: 4 },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true as const, onboardingStep: 4 as const };
}

export async function updateUserOnboarding(step: number, formData: unknown) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const payload = normalizeFormData(formData);
  const profilePatch = buildProfilePatch(payload);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: step },
    });

    if (Object.keys(profilePatch).length > 0) {
      await upsertDefaultUserProfile(
        tx,
        userId,
        session.user.email,
        profilePatch,
      );
    }
  });

  revalidatePath("/onboarding");

  return { success: true, onboardingStep: step };
}

export async function completeStep(stepNumber: number, data: unknown) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const payload = normalizeFormData(data);
  const profilePatch = buildProfilePatch(payload);
  const nextOnboardingStep = stepNumber < 4 ? stepNumber + 1 : 4;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: nextOnboardingStep },
    });

    if (Object.keys(profilePatch).length > 0) {
      await upsertDefaultUserProfile(
        tx,
        userId,
        session.user.email,
        profilePatch,
      );
    }
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true, onboardingStep: nextOnboardingStep };
}
