import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getExtensionAiApplyBlockForUser } from "@/lib/extension/extension-ai-apply-gate";
import { runApplyPipeline, type RunApplyPipelineInput } from "@/lib/extension/apply-pipeline";

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

  if (!body.url?.trim() || (body.description?.trim().length ?? 0) < 120) {
    return Response.json(
      { success: false, error: "url and job description (min 120 chars) are required" },
      { status: 400 },
    );
  }

  const aiBlock = await getExtensionAiApplyBlockForUser(userId);
  if (aiBlock) {
    return Response.json({ success: false, error: aiBlock, saved: false }, { status: 403 });
  }

  try {
    const result = await runApplyPipeline(userId, body);
    if (!result.success) {
      return Response.json(
        {
          success: false,
          saved: result.saved ?? false,
          id: result.id,
          status: result.status,
          error: result.error,
          code: result.code,
        },
        { status: result.saved ? 200 : 400 },
      );
    }

    revalidatePath("/dashboard/job-tracker");
    revalidatePath("/dashboard");

    return Response.json({
      success: true,
      saved: true,
      id: result.id,
      status: result.status,
      phases: result.phases,
      pendingPhase: result.pendingPhase,
      hasTailoredResume: result.hasTailoredResume ?? false,
      sourceProfileId: result.sourceProfileId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
