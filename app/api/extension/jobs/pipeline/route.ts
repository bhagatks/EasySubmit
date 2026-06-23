import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { runApplyPipeline, type RunApplyPipelineInput } from "@/lib/extension/apply-pipeline";

export async function POST(request: NextRequest) {
  const userId = getExtensionUserId(request);
  if (!userId) {
    return extensionUnauthorizedResponse();
  }

  let body: RunApplyPipelineInput;
  try {
    body = (await request.json()) as RunApplyPipelineInput;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url?.trim() || !body.title?.trim()) {
    return Response.json({ success: false, error: "url and title are required" }, { status: 400 });
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
