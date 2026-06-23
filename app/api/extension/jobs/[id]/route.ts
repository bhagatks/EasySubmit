import type { NextRequest } from "next/server";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";

const ALLOWED: JobTrackerStatus[] = [
  "CAPTURED",
  "RESUME_READY",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ARCHIVED",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const status =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).status === "string"
      ? ((body as Record<string, unknown>).status as JobTrackerStatus)
      : null;

  if (!status || !ALLOWED.includes(status)) {
    return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  const result = await updateJobTrackerStatus(userId, params.id, status);
  if (result.count === 0) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true, id: params.id, status });
}
