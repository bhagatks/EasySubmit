"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";

export type UpdateSystemAiSettingResult =
  | { success: true; systemAiEnabled: boolean }
  | { success: false; error: string };

export async function updateSystemAiSetting(enabled: boolean): Promise<UpdateSystemAiSettingResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const userId = session.user.id;

  logEnhance("server", "settings.system_ai.start", {
    traceId: `settings-${userId}`,
    userId,
    step: "settings.system_ai",
    enabled,
  });

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { systemAiEnabled: enabled },
      select: { systemAiEnabled: true },
    });

    logEnhance("server", "settings.system_ai.done", {
      traceId: `settings-${userId}`,
      userId,
      step: "settings.system_ai",
      systemAiEnabled: user.systemAiEnabled,
    });

    return { success: true, systemAiEnabled: user.systemAiEnabled };
  } catch (error) {
    logEnhance("server", "settings.system_ai.fail", {
      traceId: `settings-${userId}`,
      userId,
      step: "settings.system_ai",
      error: error instanceof Error ? error.message : "update_failed",
    });
    return { success: false, error: "Failed to update setting" };
  }
}
