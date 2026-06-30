import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { prisma } from "@/lib/prisma";
import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";
import {
  parseApplicationProfile,
  type ApplicationProfile,
} from "@/lib/profile/application-profile";

export type ExtensionUserPrefs = {
  autoApplyUserSwitch: boolean;
  resumeProfilePickerMode: ResumeProfilePickerMode;
  customizeResume: boolean;
  applicationProfile: ApplicationProfile | null;
  aiSourcePreference: string;
};

export async function getExtensionUserPrefs(userId: string): Promise<ExtensionUserPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      autoApplyUserSwitch: true,
      resumeProfilePickerMode: true,
      customizeResume: true,
      applicationProfile: true,
      aiSourcePreference: true,
    },
  });

  return {
    autoApplyUserSwitch: user?.autoApplyUserSwitch ?? true,
    resumeProfilePickerMode: user?.resumeProfilePickerMode ?? "DEFAULT",
    customizeResume: user?.customizeResume ?? true,
    applicationProfile: parseApplicationProfile(user?.applicationProfile ?? null),
    aiSourcePreference: user?.aiSourcePreference ?? "auto",
  };
}
