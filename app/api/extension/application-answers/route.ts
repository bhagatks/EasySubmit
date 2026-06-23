import type { NextRequest } from "next/server";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { lookupApplicationAnswers } from "@/lib/extension/application-field-memory";

export async function GET(request: NextRequest) {
  const userId = getExtensionUserId(request);
  if (!userId) return extensionUnauthorizedResponse();

  const platform = request.nextUrl.searchParams.get("platform")?.trim();
  if (!platform) {
    return Response.json({ success: false, error: "platform query param required" }, { status: 400 });
  }

  const tenantHost = request.nextUrl.searchParams.get("tenantHost");

  const answers = await lookupApplicationAnswers(userId, {
    platform,
    tenantHost,
  });

  return Response.json({ success: true, answers });
}
