import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getMergedResumeForJob } from "@/lib/profile/job-resume-tailor";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const [merged, prefs] = await Promise.all([
    getMergedResumeForJob(userId, params.id),
    getExtensionUserPrefs(userId),
  ]);

  if (!merged.success) {
    return Response.json({ success: false, error: merged.error }, { status: 404 });
  }

  const f = merged.form;
  return Response.json({
    success: true,
    fillData: {
      firstName: f.firstName ?? "",
      lastName: f.lastName ?? "",
      email: f.email ?? "",
      phone: f.phone ?? "",
      cityState: f.cityState ?? null,
      linkedIn: f.linkedIn ?? null,
    },
    applicationProfile: prefs.applicationProfile,
  });
}
