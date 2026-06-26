import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import {
  getExtensionResumeDetailDraft,
  saveExtensionResumeDetailDraft,
} from "@/lib/extension/extension-resume-form";
import {
  buildResumeDetailDraft,
  normalizeResumeDetailDraft,
} from "@/src/shared/extension/resume-detail-edit";

function readDraft(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const readString = (key: string) => (typeof record[key] === "string" ? record[key] : "");

  return buildResumeDetailDraft({
    targetTitle: readString("targetTitle"),
    firstName: readString("firstName"),
    lastName: readString("lastName"),
    email: readString("email"),
    phone: readString("phone"),
    cityState: readString("cityState"),
    linkedIn: readString("linkedIn"),
    professionalSummary: readString("professionalSummary"),
    skillsText: readString("skillsText"),
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

  const result = await getExtensionResumeDetailDraft(auth.userId, params.id);
  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }

  return Response.json({ success: true, draft: result.draft });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const draft = readDraft(record?.draft);
  if (!draft) {
    return Response.json({ success: false, error: "draft is required" }, { status: 400 });
  }

  const normalized = normalizeResumeDetailDraft(draft);
  if (!normalized.targetTitle) {
    return Response.json({ success: false, error: "Target title is required" }, { status: 400 });
  }

  const result = await saveExtensionResumeDetailDraft(auth.userId, params.id, normalized);
  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }

  return Response.json({ success: true });
}
