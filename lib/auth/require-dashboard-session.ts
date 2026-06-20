import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COMPLETED_ONBOARDING_STEP = 4;

export type DashboardSessionUser = {
  id: string;
  onboardingStep: number;
  vaultKeyId: string | null;
  activeProvider: string | null;
};

/**
 * Validates the signed-in user still exists in Postgres and meets dashboard gates.
 * Stale JWTs after a DB reset are cleared via NextAuth sign-out.
 */
export async function requireDashboardSession(
  sessionUserId: string | undefined,
): Promise<DashboardSessionUser> {
  if (!sessionUserId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      onboardingStep: true,
      vaultKeyId: true,
      activeProvider: true,
      profiles: {
        where: { isDefault: true },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!user) {
    redirect(
      `/api/auth/signout?callbackUrl=${encodeURIComponent("/login?signedOut=1&reason=stale-session")}`,
    );
  }

  if (user.onboardingStep < COMPLETED_ONBOARDING_STEP) {
    redirect("/onboarding");
  }

  if (user.profiles.length === 0) {
    redirect("/onboarding");
  }

  return {
    id: user.id,
    onboardingStep: user.onboardingStep,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
  };
}
