import type { NextRequest } from "next/server";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { listExtensionResumeProfiles } from "@/lib/extension/resume-profiles";

export async function GET(request: NextRequest) {
  const userId = getExtensionUserId(request);
  if (!userId) {
    return extensionUnauthorizedResponse();
  }

  const payload = await listExtensionResumeProfiles(userId);
  return Response.json({ success: true, ...payload });
}
