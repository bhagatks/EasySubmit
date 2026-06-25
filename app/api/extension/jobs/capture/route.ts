import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getExtensionAiApplyBlockForUser } from "@/lib/extension/extension-ai-apply-gate";
import { captureJob, type RunApplyPipelineInput } from "@/lib/extension/apply-pipeline";

export async function POST(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: RunApplyPipelineInput;
  try {
    body = (await request.json()) as RunApplyPipelineInput;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

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
