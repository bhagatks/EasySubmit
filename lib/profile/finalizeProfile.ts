import type { OnboardingPayload } from "@/lib/onboarding/payload";
import { profileEmailForUser } from "@/lib/profile/resume-profile-core";
import { getPrisma } from "@/lib/prisma";

export async function finalizeProfile(
  userId: string,
  email: string,
  payload: OnboardingPayload,
) {
  const prisma = getPrisma();
  const existingDefault = await prisma.profile.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });

  if (existingDefault) {
    return prisma.profile.update({
      where: { id: existingDefault.id },
      data: {
        email,
        targetTitle: payload.selectedRole,
        minSalary: payload.minSalary,
        isDefault: true,
      },
    });
  }

  await prisma.profile.updateMany({ where: { userId }, data: { isDefault: false } });

  return prisma.profile.create({
    data: {
      userId,
      isDefault: true,
      email: profileEmailForUser(userId, email),
      targetTitle: payload.selectedRole,
      minSalary: payload.minSalary,
    },
  });
}
