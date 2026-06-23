import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { listExtensionResumeProfiles } from "@/lib/extension/resume-profiles";

export async function GET(request: NextRequest) {
  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const payload = await listExtensionResumeProfiles(userId);
  return Response.json({ success: true, ...payload });
}
