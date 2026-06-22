import type { NextRequest } from "next/server";
import {
  extensionUnauthorizedResponse,
  getExtensionUserId,
} from "@/lib/extension/auth-request";
import { completePipelineAutofill } from "@/lib/extension/pipeline-autofill";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getExtensionUserId(request);
  if (!userId) {
    return extensionUnauthorizedResponse();
  }

  let body: { stub?: boolean; note?: string } = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as { stub?: boolean; note?: string };
    }
  } catch {
    // Empty body is fine — defaults to stub completion.
  }

  try {
    const result = await completePipelineAutofill(userId, params.id, {
      stub: body.stub ?? true,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    if (!result.success) {
      return Response.json(result, { status: result.code === "not_found" ? 404 : 400 });
    }

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autofill completion failed";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
