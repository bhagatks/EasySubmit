import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  type DashboardGateUser,
  isDashboardSessionReady,
} from "@/lib/auth/dashboard-session-gate";

export { COMPLETED_ONBOARDING_STEP, isDashboardSessionReady } from "@/lib/auth/dashboard-session-gate";

export type DashboardSessionUser = {
  id: string;
  onboardingStep: number;
  vaultKeyId: string | null;
  activeProvider: string | null;
};

type DashboardGateRecord = DashboardGateUser & {
  id: string;
  vaultKeyId: string | null;
  activeProvider: string | null;
};

async function fetchDashboardGateUser(
  sessionUserId: string,
): Promise<DashboardGateRecord | null> {
  return prisma.user.findUnique({
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
}

const getCachedDashboardGateUser = cache(fetchDashboardGateUser);

/**
 * DB-backed dashboard gate — used by layouts so JWT onboardingStep cannot fight Postgres.
 */
export async function checkDashboardSessionReady(
  sessionUserId: string | undefined,
): Promise<boolean> {
  if (!sessionUserId) {
    return false;
  }

  const user = await getCachedDashboardGateUser(sessionUserId);
  return Boolean(user && isDashboardSessionReady(user));
}

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

  const user = await getCachedDashboardGateUser(sessionUserId);

  if (!user) {
    redirect(
      `/api/auth/signout?callbackUrl=${encodeURIComponent("/login?signedOut=1&reason=stale-session")}`,
    );
  }

  if (!isDashboardSessionReady(user)) {
    redirect("/onboarding");
  }

  return {
    id: user.id,
    onboardingStep: user.onboardingStep,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
  };
}
