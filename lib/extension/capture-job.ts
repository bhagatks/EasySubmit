import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  saveJobTrackerEntry,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";

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
  return { id: saved.id, status: saved.status };
}
