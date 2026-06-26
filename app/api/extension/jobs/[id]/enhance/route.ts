import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import {
  enhanceJobCoverLetterForUser,
  enhanceJobResumeForUser,
} from "@/lib/job-tracker/enhance-review-documents";

function parseKind(value: unknown): "resume" | "cover" | null {
  if (value === "resume" || value === "cover") return value;
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;

  let kind: "resume" | "cover" | null = null;
  let useCustomerKey = false;
  try {
    const body = (await request.json()) as { kind?: unknown; useCustomerKey?: unknown };
    kind = parseKind(body.kind);
    useCustomerKey = body.useCustomerKey === true;
  } catch {
    kind = null;
  }

  if (!kind) {
    return Response.json(
      { success: false, error: "kind must be resume or cover" },
      { status: 400 },
    );
  }

  const result =
    kind === "resume"
      ? await enhanceJobResumeForUser(auth.userId, params.id, { useCustomerKey })
      : await enhanceJobCoverLetterForUser(auth.userId, params.id, { useCustomerKey });

  if (!result.success) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "unauthorized"
          ? 401
          : 400;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
