import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { mergeApplicationProfile } from "@/lib/profile/application-profile-setup";
import {
  parseApplicationProfile,
  type ApplicationProfile,
} from "@/lib/profile/application-profile";

/** Top-level JSONB merge via Postgres `||` — does not deep-merge nested keys. */
export async function patchApplicationProfileForUser(
  userId: string,
  patch: Partial<ApplicationProfile>,
): Promise<ApplicationProfile> {
  if (Object.keys(patch).length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { applicationProfile: true },
    });
    return mergeApplicationProfile(parseApplicationProfile(user?.applicationProfile ?? null), {});
  }

  await prisma.$executeRaw`
    UPDATE users
    SET "applicationProfile" = COALESCE("applicationProfile", '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
    WHERE id = ${userId}
  `;

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { applicationProfile: true },
  });

  return mergeApplicationProfile(parseApplicationProfile(updated?.applicationProfile ?? null), {});
}

export type UserPrefsPatchInput = {
  autoApplyUserSwitch?: boolean;
  applicationProfile?: Partial<ApplicationProfile>;
};

export async function patchExtensionUserPrefs(
  userId: string,
  input: UserPrefsPatchInput,
): Promise<{
  autoApplyUserSwitch: boolean;
  applicationProfile: ApplicationProfile | null;
}> {
  const data: Prisma.UserUpdateInput = {};

  if (typeof input.autoApplyUserSwitch === "boolean") {
    data.autoApplyUserSwitch = input.autoApplyUserSwitch;
  }

  if (input.applicationProfile !== undefined) {
    await patchApplicationProfileForUser(userId, input.applicationProfile);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      autoApplyUserSwitch: true,
      applicationProfile: true,
    },
  });

  return {
    autoApplyUserSwitch: user.autoApplyUserSwitch,
    applicationProfile: parseApplicationProfile(user.applicationProfile),
  };
}
