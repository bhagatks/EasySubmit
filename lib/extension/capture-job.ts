import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  initPipelineDebugProgress,
  setPipelineDebugStep,
} from "@/lib/extension/pipeline-debug-progress";
import { captureValidateArtifacts } from "@/lib/extension/pipeline-debug-artifact-builders";
import {
  saveJobTrackerEntry,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import { startPipelineTracks } from "@/lib/job-tracker/enhance/pipeline-track-coordinator";
import { resolveAiUpgrade } from "@/lib/job-tracker/enhance/resolve-ai-upgrade";
import { prisma } from "@/lib/prisma";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import { createEnhanceTraceId, logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { TAILOR_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { pipelineDebugContext } from "@/lib/extension/pipeline-debug-hooks";

export type CaptureJobInput = SaveJobTrackerInput & {
  platform?: string | null;
  sourceProfileId?: string | null;
  /** When false, skip job/resume track warm-up (e.g. customizeResume off). Default true. */
  startTracks?: boolean;
};

/** Stage 0→1: save job entry, write CAPTURED, start job+resume tracks in parallel. */
export async function captureJob(
  userId: string,
  input: CaptureJobInput,
): Promise<{ id: string; status: JobTrackerStatus }> {
  const saved = await saveJobTrackerEntry(userId, input);
  const traceId = createEnhanceTraceId();
  const persistedPlatform = saved.platform;

  await initPipelineDebugProgress(userId, saved.id, traceId);
  await setPipelineDebugStep(userId, saved.id, "capture_validate", {
    status: "done",
    detail: "Server received valid capture payload",
    meta: {
      url: input.url,
      title: saved.title,
      company: saved.company,
      descriptionChars: input.description?.trim().length ?? 0,
      platform: persistedPlatform,
      sourceProfileId: input.sourceProfileId ?? null,
    },
    artifacts: captureValidateArtifacts({
      url: input.url,
      title: saved.title,
      company: saved.company,
      descriptionChars: input.description?.trim().length ?? 0,
      platform: persistedPlatform,
      sourceProfileId: input.sourceProfileId ?? null,
    }),
  });
  await setPipelineDebugStep(userId, saved.id, "capture_save", {
    status: "done",
    detail: `Saved as ${saved.status}`,
    meta: { entryId: saved.id, status: saved.status },
  });

  if (input.startTracks !== false) {
    // Fire-and-forget: job track ∥ resume track while client proceeds to tailor.
    void startCaptureTracks(userId, saved.id, input, traceId).catch(() => undefined);
  }

  return { id: saved.id, status: saved.status };
}

async function startCaptureTracks(
  userId: string,
  jobEntryId: string,
  input: CaptureJobInput,
  traceId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SYSTEM_QUOTA_USER_SELECT,
  });
  if (!user) return;

  const aiUpgrade = await resolveAiUpgrade(user, "extension", { traceId });
  const debug = pipelineDebugContext(userId, jobEntryId);
  const targetRole = input.title?.trim() || "Professional";

  logEnhance("pipeline", "capture.tracks_start", {
    step: TAILOR_PIPELINE.APPLY_START,
    userId,
    entryId: jobEntryId,
    traceId,
    aiAllowed: aiUpgrade.aiAllowed,
  });

  startPipelineTracks({
    job: {
      userId,
      jobEntryId,
      jobDescription: input.description,
      targetRole,
      companyName: input.company,
      aiRoute: aiUpgrade.route ?? null,
      quotaUser: user,
      traceId,
      pipelineDebug: debug,
    },
    resume: {
      userId,
      jobEntryId,
      sourceProfileId: input.sourceProfileId,
      targetRole,
      traceId,
      pipelineDebug: debug,
    },
  });
}
