import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import {
  resolveExtensionUserId,
} from "@/lib/extension/auth-request";
import {
  getJobTrackerStatusForUrl,
  saveJobTrackerEntry,
} from "@/lib/extension/job-service";
import { getExtensionRuntimeConfig } from "@/lib/extension/runtime-config";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";

export async function GET(request: NextRequest) {
  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return Response.json({ success: false, error: "url query param required" }, { status: 400 });
  }

  const status = await getJobTrackerStatusForUrl(userId, url);
  return Response.json({ success: true, ...status });
}

export async function POST(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const config = await getExtensionRuntimeConfig(request.nextUrl.origin);
  if (!config.jobCardEnabled) {
    return Response.json({ success: false, error: "Job card is disabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";
  const description = typeof record.description === "string" ? record.description : "";

  if (!url.trim() || description.trim().length < 120) {
    return Response.json(
      { success: false, error: "url and job description (min 120 chars) are required" },
      { status: 400 },
    );
  }

  try {
    const saved = await saveJobTrackerEntry(userId, {
      url,
      title: typeof record.title === "string" ? record.title : "",
      company: typeof record.company === "string" ? record.company : null,
      location: typeof record.location === "string" ? record.location : null,
      salaryText: typeof record.salaryText === "string" ? record.salaryText : null,
      description: typeof record.description === "string" ? record.description : null,
      platform: typeof record.platform === "string" ? record.platform : null,
      sourceProfileId:
        typeof record.sourceProfileId === "string" ? record.sourceProfileId : null,
      metadata:
        record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
          ? (record.metadata as Record<string, unknown>)
          : null,
    });

    revalidatePath("/dashboard/job-tracker");
    revalidatePath("/dashboard");

    return Response.json({
      success: true,
      saved: true,
      id: saved.id,
      status: saved.status,
      title: saved.title,
      company: saved.company,
      url: saved.canonicalUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("Foreign key constraint")
        ? "Your extension session is out of date. Sign in again and reconnect from Settings."
        : err instanceof Error
          ? err.message
          : "Save failed";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
