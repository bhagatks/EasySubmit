import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  initPipelineDebugProgress,
  setPipelineDebugStep,
} from "@/lib/extension/pipeline-debug-progress";
import {
  saveJobTrackerEntry,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import { createEnhanceTraceId } from "@/src/lib/ai/engine/enhance-logger";

export type CaptureJobInput = SaveJobTrackerInput & {
  platform?: string | null;
  sourceProfileId?: string | null;
};

/** Stage 0→1: save job entry, write CAPTURED, return immediately. */
export async function captureJob(
  userId: string,
  input: CaptureJobInput,
): Promise<{ id: string; status: JobTrackerStatus }> {
  const saved = await saveJobTrackerEntry(userId, input);
  const traceId = createEnhanceTraceId();

  await initPipelineDebugProgress(userId, saved.id, traceId);
  await setPipelineDebugStep(userId, saved.id, "capture_validate", {
    status: "done",
    detail: "Server received valid capture payload",
    meta: {
      url: input.url,
      title: saved.title,
      company: saved.company,
      descriptionChars: input.description?.trim().length ?? 0,
      platform: input.platform ?? null,
      sourceProfileId: input.sourceProfileId ?? null,
    },
  });
  await setPipelineDebugStep(userId, saved.id, "capture_save", {
    status: "done",
    detail: `Saved as ${saved.status}`,
    meta: { entryId: saved.id, status: saved.status },
  });

  return { id: saved.id, status: saved.status };
}
