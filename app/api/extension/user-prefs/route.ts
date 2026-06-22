import type { NextRequest } from "next/server";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const userId = getExtensionUserId(request);
  if (!userId) {
    return extensionUnauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const oneClickApply =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).oneClickApply === "boolean"
      ? ((body as Record<string, unknown>).oneClickApply as boolean)
      : null;

  if (oneClickApply === null) {
    return Response.json({ success: false, error: "oneClickApply boolean is required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { oneClickApply },
    select: { oneClickApply: true },
  });

  return Response.json({ success: true, oneClickApply: user.oneClickApply });
}
