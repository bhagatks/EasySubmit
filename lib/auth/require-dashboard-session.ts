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

  return user;
}
