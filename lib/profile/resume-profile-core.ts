import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ResumeProfile = Prisma.ProfileGetPayload<object>;

/** @deprecated Use `ResumeProfile` */
export type ProfileWithArchitecture = ResumeProfile;

export function profileEmailForUser(userId: string, email?: string | null): string {
  return email ?? `${userId}@users.easysubmit.local`;
}

export async function findDefaultProfile(userId: string): Promise<ResumeProfile | null> {
  return prisma.profile.findFirst({
    where: { userId, isDefault: true },
  });
}

export async function findProfileForUser(
  userId: string,
  profileId: string,
): Promise<ResumeProfile | null> {
  return prisma.profile.findFirst({
    where: { id: profileId, userId },
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

export function profileContentPatch(
  data: Record<string, unknown>,
): Pick<Prisma.ProfileUpdateInput, "content" | "calibrationScore"> {
  const patch: Pick<Prisma.ProfileUpdateInput, "content" | "calibrationScore"> = {};

  if (data.parsedData !== undefined) {
    patch.content = data.parsedData as Prisma.InputJsonValue;
  }
  if (data.content !== undefined) {
    patch.content = data.content as Prisma.InputJsonValue;
  }
  if (data.calibrationScore !== undefined) {
    patch.calibrationScore = data.calibrationScore as number;
  }

  return patch;
}
