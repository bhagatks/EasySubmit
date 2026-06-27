"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_PLANS = ["free"] as const;
type AllowedPlan = (typeof ALLOWED_PLANS)[number];

function isAllowedPlan(value: string): value is AllowedPlan {
  return ALLOWED_PLANS.includes(value as AllowedPlan);
}

export async function selectPlan(planId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "unauthenticated" };
  }

  if (!isAllowedPlan(planId)) {
    return { success: false, error: "invalid_plan" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      plan: planId,
      planConfirmedAt: new Date(),
    },
  });

  return { success: true };
}
