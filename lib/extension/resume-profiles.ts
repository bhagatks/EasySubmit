import { prisma } from "@/lib/prisma";

export type {
  ExtensionResumeProfileOption,
  ExtensionResumeProfilesPayload,
} from "@/lib/extension/resolve-profile-selection";
export { resolveExtensionProfileSelection } from "@/lib/extension/resolve-profile-selection";

function profileLabel(targetTitle: string | null, firstName: string | null, lastName: string | null): string {
  const role = targetTitle?.trim();
  if (role) return role;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "Untitled profile";
}

export function resumeProfileDisplayLabel(profile: {
  targetTitle: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  return profileLabel(profile.targetTitle, profile.firstName, profile.lastName);
}

export async function listExtensionResumeProfiles(
  userId: string,
): Promise<import("@/lib/extension/resolve-profile-selection").ExtensionResumeProfilesPayload> {
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { resumeProfilePickerMode: true },
    }),
    prisma.profile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        targetTitle: true,
        firstName: true,
        lastName: true,
        isDefault: true,
      },
    }),
  ]);

  const profiles = rows.map((row) => ({
    id: row.id,
    label: profileLabel(row.targetTitle, row.firstName, row.lastName),
    isDefault: row.isDefault,
  }));

  const defaultProfileId = profiles.find((p) => p.isDefault)?.id ?? profiles[0]?.id ?? null;

  return {
    profiles,
    pickerMode: user?.resumeProfilePickerMode ?? "DEFAULT",
    defaultProfileId,
  };
}
