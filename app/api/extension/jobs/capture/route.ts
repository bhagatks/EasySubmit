import type { NextRequest } from "next/server";
import { captureJob, type CaptureJobInput } from "@/lib/extension/capture-job";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getExtensionAiApplyBlockForUser } from "@/lib/extension/extension-ai-apply-gate";
import { readExtensionJsonBody } from "@/lib/extension/extension-request-body";

export async function POST(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const parsed = await readExtensionJsonBody<CaptureJobInput>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (!body.url?.trim()) {
    return Response.json({ success: false, error: "url is required" }, { status: 400 });
  }

  const aiBlock = await getExtensionAiApplyBlockForUser(userId);
  if (aiBlock) {
    return Response.json({ success: false, error: aiBlock }, { status: 403 });
  }

  try {
    const { id, status } = await captureJob(userId, body);
    return Response.json({ success: true, id, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capture failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
