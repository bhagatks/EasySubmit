import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { prisma } from "@/lib/prisma";

const activeEntryWhere = {
  archivedAt: null,
  status: { not: "ARCHIVED" as const },
};

export async function GET(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const [total, captured, readyToApply] = await Promise.all([
    prisma.jobTrackerEntry.count({
      where: { userId, ...activeEntryWhere },
    }),
    prisma.jobTrackerEntry.count({
      where: { userId, ...activeEntryWhere, status: "CAPTURED" },
    }),
    prisma.jobTrackerEntry.count({
      where: { userId, ...activeEntryWhere, status: "READY_TO_APPLY" },
    }),
  ]);

  return Response.json({
    success: true,
    captured,
    readyToApply,
    total,
  });
}
