import type { NextRequest } from "next/server";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { getMergedResumeForJob } from "@/lib/profile/job-resume-tailor";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getExtensionUserId(request);
  if (!userId) return extensionUnauthorizedResponse();

  const merged = await getMergedResumeForJob(userId, params.id);
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
  });
}
