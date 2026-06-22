import { prisma } from "@/lib/prisma";
import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";

export type ExtensionUserPrefs = {
  oneClickApply: boolean;
  resumeProfilePickerMode: ResumeProfilePickerMode;
};

export async function getExtensionUserPrefs(userId: string): Promise<ExtensionUserPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { oneClickApply: true, resumeProfilePickerMode: true },
  });

  return {
    oneClickApply: user?.oneClickApply ?? true,
    resumeProfilePickerMode: user?.resumeProfilePickerMode ?? "DEFAULT",
  };
}
