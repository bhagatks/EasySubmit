import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getPipelineDebugProgress } from "@/lib/extension/pipeline-debug-progress";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

type RouteParams = { params: { id: string } };

/** Dev-only QA endpoint — live Apply pipeline step status for extension overlay. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!isPipelineDebugEnabled()) {
    return Response.json({ success: false, error: "Not available" }, { status: 404 });
  }

  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const entryId = params.id?.trim();
  if (!entryId) {
    return Response.json({ success: false, error: "Job id required" }, { status: 400 });
  }

  const progress = await getPipelineDebugProgress(userId, entryId);
  if (!progress) {
    return Response.json({ success: true, progress: null });
  }

  return Response.json({ success: true, progress });
}
