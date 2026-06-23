import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";
import {
  RESUME_PROFILES_DEFAULTS,
} from "@/src/lib/services/resume-profiles-config";

type ProfileCountClient = Pick<Prisma.TransactionClient, "profile">;

export function formatResumeProfileLimitError(maxProfiles: number): string {
  return `You can have up to ${maxProfiles} resume profile${maxProfiles === 1 ? "" : "s"}. Delete one to add another.`;
}

export async function getResumeProfilesConfig(): Promise<ResumeProfilesConfig> {
  return getAppConfig("resumeProfiles");
}

export async function countUserProfilesForLimit(
  userId: string,
  client: ProfileCountClient = prisma,
): Promise<number> {
  return client.profile.count({ where: { userId } });
}

export type ResumeProfileLimitCheck =
  | { ok: true; maxProfiles: number; currentCount: number }
  | { ok: false; maxProfiles: number; currentCount: number; error: string };

export async function checkUserCanCreateResumeProfile(
  userId: string,
  client: ProfileCountClient = prisma,
): Promise<ResumeProfileLimitCheck> {
  const { maxProfilesPerCustomer: maxProfiles } = await getResumeProfilesConfig();
  const currentCount = await countUserProfilesForLimit(userId, client);

  if (currentCount >= maxProfiles) {
    return {
      ok: false,
      maxProfiles,
      currentCount,
      error: formatResumeProfileLimitError(maxProfiles),
    };
  }

  return { ok: true, maxProfiles, currentCount };
}
