import type { OnboardingPayload } from "@/lib/onboarding/payload";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function finalizeProfile(
  userId: string,
  email: string,
  payload: OnboardingPayload,
  resumeFile?: File | null
) {
  const supabase = await createClient();
  let resumePath: string | null = null;

  if (resumeFile) {
    const path = `${userId}/${Date.now()}-${resumeFile.name}`;
    const buffer = Buffer.from(await resumeFile.arrayBuffer());

    const { error } = await supabase.storage
      .from("resumes")
      .upload(path, buffer, {
        contentType: resumeFile.type || "application/octet-stream",
        upsert: true,
      });

    if (!error) {
      resumePath = path;
    }
  }

  const targetLocations = payload.targetLocations as unknown as Prisma.InputJsonValue;

  return getPrisma().$transaction(async (tx) => {
    return tx.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        email,
        jobTimeline: payload.jobTimeline,
        experienceLevels: payload.experienceLevels,
        selectedRole: payload.selectedRole,
        minSalary: payload.minSalary,
        referralSource: payload.referralSource,
        targetLocations,
        resumePath,
        resumeFileName: payload.resumeFileName,
      },
      update: {
        email,
        jobTimeline: payload.jobTimeline,
        experienceLevels: payload.experienceLevels,
        selectedRole: payload.selectedRole,
        minSalary: payload.minSalary,
        referralSource: payload.referralSource,
        targetLocations,
        resumePath: resumePath ?? undefined,
        resumeFileName: payload.resumeFileName,
      },
    });
  });
}
