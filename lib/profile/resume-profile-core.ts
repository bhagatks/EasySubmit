import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProfileWithArchitecture = Prisma.ProfileGetPayload<{
  include: { architecture: true };
}>;

export function profileEmailForUser(userId: string, email?: string | null): string {
  return email ?? `${userId}@users.easysubmit.local`;
}

export async function findDefaultProfile(userId: string): Promise<ProfileWithArchitecture | null> {
  return prisma.profile.findFirst({
    where: { userId, isDefault: true },
    include: { architecture: true },
  });
}

export async function findProfileForUser(
  userId: string,
  profileId: string,
): Promise<ProfileWithArchitecture | null> {
  return prisma.profile.findFirst({
    where: { id: profileId, userId },
    include: { architecture: true },
  });
}

export async function countUserProfiles(userId: string): Promise<number> {
  return prisma.profile.count({ where: { userId } });
}

/** Ensure exactly one default when profiles exist; returns default profile id. */
export async function ensureDefaultProfile(userId: string): Promise<string | null> {
  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, isDefault: true },
  });

  if (profiles.length === 0) {
    return null;
  }

  const defaultProfile = profiles.find((row) => row.isDefault);
  if (defaultProfile) {
    return defaultProfile.id;
  }

  const firstId = profiles[0].id;
  await prisma.$transaction([
    prisma.profile.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.profile.update({ where: { id: firstId }, data: { isDefault: true } }),
  ]);

  return firstId;
}

export async function setDefaultProfileForUser(
  userId: string,
  profileId: string,
): Promise<boolean> {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { id: true },
  });

  if (!profile) {
    return false;
  }

  await prisma.$transaction([
    prisma.profile.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.profile.update({ where: { id: profileId }, data: { isDefault: true } }),
  ]);

  return true;
}

export async function upsertProfileArchitecture(
  tx: Prisma.TransactionClient,
  profileId: string,
  architecturePatch: Prisma.ArchitectureUpdateInput,
  targetTitle?: string | null,
) {
  const targetRole =
    (architecturePatch.targetRole as string | undefined) ??
    targetTitle?.trim() ??
    "";

  const mergedPatch: Prisma.ArchitectureUpdateInput = {
    ...architecturePatch,
    ...(targetRole ? { targetRole } : {}),
  };

  if (Object.keys(architecturePatch).length > 0 || targetRole) {
    await tx.architecture.upsert({
      where: { profileId },
      create: {
        profileId,
        targetRole,
        calibrationScore:
          (mergedPatch.calibrationScore as number | undefined) ?? 0,
        content:
          (mergedPatch.content as Prisma.InputJsonValue | undefined) ?? {},
      },
      update: mergedPatch,
    });
    return;
  }

  await tx.architecture.upsert({
    where: { profileId },
    create: {
      profileId,
      targetRole,
      content: {},
    },
    update: {},
  });
}
