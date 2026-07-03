import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPipelineDebugJobs } from "@/lib/extension/pipeline-debug-list";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

/** Dev-only — jobs that have pipeline debug metadata from Apply runs. */
export async function GET(_request: NextRequest) {
  if (!isPipelineDebugEnabled()) {
    return Response.json({ success: false, error: "Not available" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listPipelineDebugJobs(session.user.id);
  return Response.json({ success: true, jobs });
}
