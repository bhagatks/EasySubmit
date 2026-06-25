import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import {
  buildExtensionJobPreviewHtml,
  type ExtensionJobPreviewKind,
} from "@/lib/extension/extension-job-preview";

function parseKind(value: string | null): ExtensionJobPreviewKind | null {
  if (value === "resume" || value === "cover") return value;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;

  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  if (!kind) {
    return Response.json(
      { success: false, error: "kind must be resume or cover" },
      { status: 400 },
    );
  }

  const result = await buildExtensionJobPreviewHtml(auth.userId, params.id, kind);
  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }

  return Response.json({
    success: true,
    previewHtml: result.previewHtml,
  });
}
