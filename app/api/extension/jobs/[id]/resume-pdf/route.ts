import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { buildExtensionResumePdf } from "@/lib/extension/extension-job-pdf";

function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;

  const result = await buildExtensionResumePdf(auth.userId, params.id);
  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }

  return pdfResponse(result.bytes, result.filename);
}
