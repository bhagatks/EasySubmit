import type { NextRequest } from "next/server";
import { readBearerToken, verifyExtensionToken } from "@/lib/extension/auth-token";

export function getExtensionUserId(request: NextRequest): string | null {
  const bearer = readBearerToken(request.headers.get("authorization"));
  return verifyExtensionToken(bearer);
}

export function extensionUnauthorizedResponse(): Response {
  return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
}
