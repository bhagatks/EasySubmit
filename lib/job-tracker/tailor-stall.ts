import type { JobTrackerStatus } from "@/lib/generated/prisma/client";

/** After this duration a CAPTURED job without a tailor row is treated as stalled. */
export const TAILOR_STALL_MS = 2 * 60 * 1000;

export type TailorStallInput = {
  status: JobTrackerStatus;
  hasTailoredResume?: boolean;
  savedAt: string;
  issueMessage?: string | null;
  nowMs?: number;
};

export function isTailorStalled(input: TailorStallInput): boolean {
  if (input.status !== "CAPTURED") return false;
  if (input.hasTailoredResume) return false;
  if (input.issueMessage?.trim()) return true;

  const savedMs = Date.parse(input.savedAt);
  if (Number.isNaN(savedMs)) return false;

  const now = input.nowMs ?? Date.now();
  return now - savedMs >= TAILOR_STALL_MS;
}
