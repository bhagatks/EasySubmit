import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { lookupApplicationAnswers } from "@/lib/extension/application-field-memory";

export async function GET(request: NextRequest) {
  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

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
