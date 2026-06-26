import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { markJobTrackerApplied } from "@/lib/extension/mark-applied";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let source: "extension_auto" | "extension_manual" = "extension_manual";
  try {
    const body = (await request.json()) as { source?: string };
    if (body?.source === "extension_auto") {
      source = "extension_auto";
    }
  } catch {
    // Empty body is fine.
  }

  // [ES:LOG] SERVER → DB write: status=APPLIED (source: extension_auto or extension_manual)
  console.log("[EasySubmit] server:mark-applied", { entryId: params.id, userId, source });
  const result = await markJobTrackerApplied(userId, params.id, source);
  if (!result.success) {
    return Response.json(result, { status: result.code === "not_found" ? 404 : 400 });
  }

  // [ES:LOG] SERVER ← DB write APPLIED success — revalidating dashboard, web will pick up
  console.log("[EasySubmit] server:mark-applied success", { entryId: params.id, result });
  revalidatePath("/dashboard/job-tracker");
  revalidatePath("/dashboard");

  return Response.json(result);
}
