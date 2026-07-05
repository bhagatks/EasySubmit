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
    const debug = pipelineDebugContext(userId, saved.id);
    const targetRole = input.title?.trim() || "Professional";

    logEnhance("pipeline", "capture.tracks_start", {
      step: TAILOR_PIPELINE.APPLY_START,
      userId,
      entryId: saved.id,
      traceId,
    });

    // Register tracks synchronously so tailor's awaitPipelineTracks cannot start a duplicate JD run.
    // Warm-start JD track only — resume prep needs tailor form (see pipeline-track-coordinator).
    startPipelineTracks({
      job: {
        userId,
        jobEntryId: saved.id,
        jobDescription: input.description,
        targetRole,
        companyName: input.company,
        traceId,
        surface: "extension",
        pipelineDebug: debug,
      },
    });
  }

  return { id: saved.id, status: saved.status };
}
