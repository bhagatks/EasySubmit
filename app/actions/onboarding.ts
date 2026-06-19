"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type CompleteOnboardingInput = {
  targetTitle?: string | null;
  minSalary?: number | null;
  workMode?: string | null;
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
  if (data.fullName !== undefined) {
    patch.fullName = data.fullName as string | null;
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

function buildEnginePatch(data: Record<string, unknown>): Prisma.EngineUpdateInput {
  const patch: Prisma.EngineUpdateInput = {};

  if (data.parsedData !== undefined) {
    patch.parsedData = data.parsedData as Prisma.InputJsonValue;
  }

  return patch;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function profileEmailForUser(userId: string, email?: string | null): string {
  return email ?? `${userId}@users.easysubmit.local`;
}

async function upsertUserProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string | null | undefined,
  profilePatch: Prisma.ProfileUpdateInput,
) {
  const profileEmail =
    (profilePatch.email as string | undefined) ?? profileEmailForUser(userId, email);
  const createData: Prisma.ProfileUncheckedCreateInput = {
    userId,
    email: profileEmail,
    targetTitle: profilePatch.targetTitle as string | null | undefined,
    minSalary: profilePatch.minSalary as number | null | undefined,
    workMode: profilePatch.workMode as string | null | undefined,
    resumeRawText: profilePatch.resumeRawText as string | null | undefined,
    fullName: profilePatch.fullName as string | null | undefined,
    phone: profilePatch.phone as string | null | undefined,
    city: profilePatch.city as string | null | undefined,
    country: profilePatch.country as string | null | undefined,
    summary: profilePatch.summary as string | null | undefined,
    coreCompetencies: profilePatch.coreCompetencies as string[] | undefined,
    skills: profilePatch.skills as string[] | undefined,
  };

  await tx.profile.upsert({
    where: { userId },
    create: createData,
    update: {
      ...(email || profilePatch.email
        ? { email: (profilePatch.email as string | undefined) ?? profileEmail }
        : {}),
      ...profilePatch,
    },
  });
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
  const enginePatch = buildEnginePatch(payload);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: 4 },
    });

    await upsertUserProfile(tx, userId, session.user.email, profilePatch);

    if (Object.keys(enginePatch).length > 0) {
      await tx.engine.upsert({
        where: { userId },
        create: {
          userId,
          parsedData: enginePatch.parsedData as Prisma.InputJsonValue | undefined,
        },
        update: enginePatch,
      });
    } else {
      await tx.engine.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }
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
  const enginePatch = buildEnginePatch(payload);

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
      await upsertUserProfile(tx, userId, session.user.email, profilePatch);
    }

    if (Object.keys(enginePatch).length > 0) {
      await tx.engine.upsert({
        where: { userId },
        create: {
          userId,
          parsedData: enginePatch.parsedData as Prisma.InputJsonValue | undefined,
        },
        update: enginePatch,
      });
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
  const enginePatch = buildEnginePatch(payload);
  const nextOnboardingStep = stepNumber < 4 ? stepNumber + 1 : 4;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingStep: nextOnboardingStep },
    });

    if (Object.keys(profilePatch).length > 0) {
      await upsertUserProfile(tx, userId, session.user.email, profilePatch);
    }

    if (Object.keys(enginePatch).length > 0) {
      await tx.engine.upsert({
        where: { userId },
        create: {
          userId,
          parsedData: enginePatch.parsedData as Prisma.InputJsonValue | undefined,
        },
        update: enginePatch,
      });
    }
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { success: true, onboardingStep: nextOnboardingStep };
}
