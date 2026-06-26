import type { NextRequest } from "next/server";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import {
  updateJobTrackerEntryFields,
  updateJobTrackerStatus,
} from "@/lib/extension/job-service";
import { canApplyCapture } from "@/src/shared/extension/apply-gate";
import { prisma } from "@/lib/prisma";

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

function readJsonLdFields(
  value: unknown,
):
  | {
      qualifications?: string;
      responsibilities?: string;
      incentives?: string;
    }
  | undefined {
  // null/missing = caller omitted jsonLdFields entirely → don't touch existing metadata
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  // Empty object {} = explicit clear → pass through so mergeJsonLdIntoMetadata removes them
  return {
    ...(typeof record.qualifications === "string" ? { qualifications: record.qualifications } : {}),
    ...(typeof record.responsibilities === "string" ? { responsibilities: record.responsibilities } : {}),
    ...(typeof record.incentives === "string" ? { incentives: record.incentives } : {}),
  };
}

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

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!record) {
    return Response.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  if (record.fields && typeof record.fields === "object" && !Array.isArray(record.fields)) {
    const fields = record.fields as Record<string, unknown>;

    if (typeof fields.description === "string") {
      const entry = await prisma.jobTrackerEntry.findFirst({
        where: { id: params.id, userId, archivedAt: null },
        select: { canonicalUrl: true },
      });
      if (
        entry &&
        !canApplyCapture({ url: entry.canonicalUrl, description: fields.description })
      ) {
        return Response.json(
          { success: false, error: "Job description must be at least 120 characters." },
          { status: 400 },
        );
      }
    }

    try {
      const updated = await updateJobTrackerEntryFields(userId, params.id, {
        title: typeof fields.title === "string" ? fields.title : undefined,
        company: typeof fields.company === "string" ? fields.company : fields.company === null ? null : undefined,
        location:
          typeof fields.location === "string" ? fields.location : fields.location === null ? null : undefined,
        salaryText:
          typeof fields.salaryText === "string"
            ? fields.salaryText
            : fields.salaryText === null
              ? null
              : undefined,
        description:
          typeof fields.description === "string"
            ? fields.description
            : fields.description === null
              ? null
              : undefined,
        platform:
          typeof fields.platform === "string" ? fields.platform : fields.platform === null ? null : undefined,
        jsonLdFields: readJsonLdFields(fields.jsonLdFields),
      });

      if (!updated) {
        return Response.json({ success: false, error: "Not found" }, { status: 404 });
      }

      return Response.json({
        success: true,
        id: updated.id,
        title: updated.title,
        company: updated.company,
        location: updated.location,
        salaryText: updated.salaryText,
        description: updated.description,
        platform: updated.platform,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      return Response.json({ success: false, error: message }, { status: 400 });
    }
  }

  const status =
    typeof record.status === "string" ? (record.status as JobTrackerStatus) : null;

  if (!status || !ALLOWED.includes(status)) {
    return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  const result = await updateJobTrackerStatus(userId, params.id, status);
  if (result.count === 0) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true, id: params.id, status });
}
