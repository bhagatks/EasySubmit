import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getExtensionAiApplyBlockForUser } from "@/lib/extension/extension-ai-apply-gate";
import { tailorJobPipeline } from "@/lib/extension/apply-pipeline";
import { loadTailorInputFromEntry } from "@/lib/extension/job-service";
import { recordPipelineTailorError } from "@/lib/extension/pipeline-metadata";

type TailorRequestBody = { entryId: string };

export async function POST(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: TailorRequestBody;
  try {
    body = (await request.json()) as TailorRequestBody;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const entryId = body.entryId?.trim();
  if (!entryId) {
    return Response.json({ success: false, error: "entryId is required" }, { status: 400 });
  }

  const aiBlock = await getExtensionAiApplyBlockForUser(userId);
  if (aiBlock) {
    return Response.json({ success: false, error: aiBlock }, { status: 403 });
  }

  const entryInput = await loadTailorInputFromEntry(userId, entryId);
  if (!entryInput) {
    return Response.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  try {
    const result = await tailorJobPipeline(userId, entryId, entryInput);
    revalidatePath("/dashboard/job-tracker");
    revalidatePath("/dashboard");
    return Response.json({
      success: result.success,
      status: result.status,
      error: result.error,
      warning: result.warning ?? null,
      action: result.action ?? null,
      actionHref: result.actionHref ?? null,
      aiAttempted: result.aiAttempted,
      aiSucceeded: result.aiSucceeded,
      aiBlockCode: result.aiBlockCode ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tailor failed";
    await recordPipelineTailorError(userId, entryId, message, "tailor_crashed");
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
