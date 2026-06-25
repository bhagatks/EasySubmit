import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { tailorJobPipeline, type RunApplyPipelineInput } from "@/lib/extension/apply-pipeline";

type TailorRequestBody = RunApplyPipelineInput & { entryId: string };

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

  if (!body.entryId?.trim()) {
    return Response.json({ success: false, error: "entryId is required" }, { status: 400 });
  }

  try {
    const result = await tailorJobPipeline(userId, body.entryId, body);
    revalidatePath("/dashboard/job-tracker");
    revalidatePath("/dashboard");
    return Response.json({ success: result.success, status: result.status, error: result.error });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tailor failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
