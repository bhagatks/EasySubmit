import type { OnboardingPayload } from "@/lib/onboarding/payload";
import { getPrisma } from "@/lib/prisma";

export async function finalizeProfile(
  userId: string,
  email: string,
  payload: OnboardingPayload,
) {
  return getPrisma().profile.upsert({
    where: { userId },
    create: {
      userId,
      email,
      targetTitle: payload.selectedRole,
      minSalary: payload.minSalary,
    },
    update: {
      email,
      targetTitle: payload.selectedRole,
      minSalary: payload.minSalary,
    },
  });
}
