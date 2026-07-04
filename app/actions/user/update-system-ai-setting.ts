"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UpdateSystemAiSettingResult =
  | { success: true; systemAiEnabled: boolean }
  | { success: false; error: string };

export async function updateSystemAiSetting(enabled: boolean): Promise<UpdateSystemAiSettingResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { systemAiEnabled: enabled },
      select: { systemAiEnabled: true },
    });

    return { success: true, systemAiEnabled: user.systemAiEnabled };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update setting";
    return { success: false, error: message };
  }
}
