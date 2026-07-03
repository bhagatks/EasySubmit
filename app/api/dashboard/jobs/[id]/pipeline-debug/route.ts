import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolvePipelineStepFailureFromMetadata } from "@/lib/job-tracker/pipeline-tracker-view";
import { entryIssueMessage } from "@/lib/job-tracker/entry-issue";
import { getPipelineDebugProgress } from "@/lib/extension/pipeline-debug-progress";
import { prisma } from "@/lib/prisma";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

type RouteParams = { params: { id: string } };

/** Dev-only dashboard QA — session auth, rich step artifacts. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!isPipelineDebugEnabled()) {
    return Response.json({ success: false, error: "Not available" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const entryId = params.id?.trim();
  if (!entryId) {
    return Response.json({ success: false, error: "Job id required" }, { status: 400 });
  }

  const userId = session.user.id;
  const [progress, entry] = await Promise.all([
    getPipelineDebugProgress(userId, entryId),
    prisma.jobTrackerEntry.findFirst({
      where: { id: entryId, userId },
      select: {
        status: true,
        title: true,
        company: true,
        location: true,
        salaryText: true,
        description: true,
        platform: true,
        canonicalUrl: true,
        metadata: true,
      },
    }),
  ]);

  if (!entry) {
    return Response.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const metadata =
    entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : null;

  return Response.json({
    success: true,
    progress,
    stepFailure: resolvePipelineStepFailureFromMetadata(metadata, entry.status),
    job: {
      status: entry.status,
      title: entry.title,
      issueMessage: entryIssueMessage({
        url: entry.canonicalUrl,
        title: entry.title,
        company: entry.company,
        location: entry.location,
        salaryText: entry.salaryText,
        description: entry.description,
        platform: entry.platform,
        metadata,
      }),
      metadata,
    },
  });
}
