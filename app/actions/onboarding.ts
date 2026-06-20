"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProfileName } from "@/lib/profile/name";
import {
  profileEmailForUser,
  upsertProfileArchitecture,
} from "@/lib/profile/resume-profile-core";
import type { Prisma } from "@/lib/generated/prisma/client";

export type CompleteOnboardingInput = {
  targetTitle?: string | null;
  minSalary?: number | null;
  workMode?: string | null;
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
  coreCompetencies?: string[];
  parsedData?: Prisma.InputJsonValue;
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
  const patch: Prisma.ProfileUpdateInput = {};

  if (data.targetTitle !== undefined) {
    patch.targetTitle = data.targetTitle as string | null;
  }
  if (data.minSalary !== undefined) {
    patch.minSalary = data.minSalary as number | null;
  }
  if (data.workMode !== undefined) {
    patch.workMode = data.workMode as string | null;
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
  if (data.coreCompetencies !== undefined) {
    patch.coreCompetencies = data.coreCompetencies as string[];
  }
  if (data.skills !== undefined) {
    patch.skills = data.skills as string[];
  }

  return patch;
}

function buildArchitecturePatch(data: Record<string, unknown>): Prisma.ArchitectureUpdateInput {
  const patch: Prisma.ArchitectureUpdateInput = {};

  if (data.parsedData !== undefined) {
    patch.content = data.parsedData as Prisma.InputJsonValue;
  }
  if (data.content !== undefined) {
    patch.content = data.content as Prisma.InputJsonValue;
  }
  if (data.targetRole !== undefined) {
    patch.targetRole = data.targetRole as string;
  }
  if (data.calibrationScore !== undefined) {
    patch.calibrationScore = data.calibrationScore as number;
  }

  return patch;
}

async function upsertProfileArchitectureForUser(
  tx: Prisma.TransactionClient,
  profileId: string,
  architecturePatch: Prisma.ArchitectureUpdateInput,
  profilePatch: Prisma.ProfileUpdateInput,
) {
  if (Object.keys(architecturePatch).length > 0) {
    await upsertProfileArchitecture(
      tx,
      profileId,
      architecturePatch,
      profilePatch.targetTitle as string | null | undefined,
    );
    return;
  }

  await upsertProfileArchitecture(
    tx,
    profileId,
    {},
    profilePatch.targetTitle as string | null | undefined,
  );
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
    minSalary: profilePatch.minSalary as number | null | undefined,
    workMode: profilePatch.workMode as string | null | undefined,
    resumeRawText: profilePatch.resumeRawText as string | null | undefined,
    firstName: profilePatch.firstName as string | null | undefined,
    lastName: profilePatch.lastName as string | null | undefined,
    phone: profilePatch.phone as string | null | undefined,
    city: profilePatch.city as string | null | undefined,
    country: profilePatch.country as string | null | undefined,
    summary: profilePatch.summary as string | null | undefined,
    coreCompetencies: profilePatch.coreCompetencies as string[] | undefined,
    skills: profilePatch.skills as string[] | undefined,
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

export async function completeOnboarding(data: CompleteOnboardingInput = {}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const payload = normalizeFormData(data);
  const profilePatch = buildProfilePatch(payload);
  const architecturePatch = buildArchitecturePatch(payload);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: 4 },
    });

    const profileId = await upsertDefaultUserProfile(
      tx,
      userId,
      session.user.email,
      profilePatch,
    );
    await upsertProfileArchitectureForUser(
      tx,
      profileId,
      architecturePatch,
      profilePatch,
    );
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true, onboardingStep: 4 };
}

export async function updateUserOnboarding(step: number, formData: unknown) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const payload = normalizeFormData(formData);
  const profilePatch = buildProfilePatch(payload);
  const architecturePatch = buildArchitecturePatch(payload);

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

    let profileId: string | null = null;

    if (Object.keys(profilePatch).length > 0) {
      profileId = await upsertDefaultUserProfile(
        tx,
        userId,
        session.user.email,
        profilePatch,
      );
    } else {
      const existing = await tx.profile.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      });
      profileId = existing?.id ?? null;
    }

    if (profileId) {
      await upsertProfileArchitectureForUser(
        tx,
        profileId,
        architecturePatch,
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
  const architecturePatch = buildArchitecturePatch(payload);
  const nextOnboardingStep = stepNumber < 4 ? stepNumber + 1 : 4;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: nextOnboardingStep },
    });

    let profileId: string | null = null;

    if (Object.keys(profilePatch).length > 0) {
      profileId = await upsertDefaultUserProfile(
        tx,
        userId,
        session.user.email,
        profilePatch,
      );
    } else {
      const existing = await tx.profile.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      });
      profileId = existing?.id ?? null;
    }

    if (profileId) {
      await upsertProfileArchitectureForUser(
        tx,
        profileId,
        architecturePatch,
        profilePatch,
      );
    }
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true, onboardingStep: nextOnboardingStep };
}
