import type { PipelineDebugStep } from "@/src/shared/extension/pipeline-debug-types";

/** Format milliseconds as `Xm Ys` (e.g. `4m 51s`, `0m 18s`). */
export function formatDurationMinSec(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function computeStepDurationMs(
  step: Pick<PipelineDebugStep, "startedAt" | "finishedAt">,
  nowMs: number = Date.now(),
): number | null {
  if (!step.startedAt) return null;
  const start = Date.parse(step.startedAt);
  if (!Number.isFinite(start)) return null;

  const endRaw = step.finishedAt ? Date.parse(step.finishedAt) : nowMs;
  if (!Number.isFinite(endRaw)) return null;

  const durationMs = endRaw - start;
  return durationMs >= 0 ? durationMs : null;
}

/** Human label for a pipeline step duration, or null when timing is unavailable. */
export function formatStepDurationLabel(
  step: Pick<PipelineDebugStep, "status" | "startedAt" | "finishedAt">,
  nowMs: number = Date.now(),
): string | null {
  const durationMs = computeStepDurationMs(step, nowMs);
  if (durationMs === null) return null;
  const label = formatDurationMinSec(durationMs);
  return step.status === "active" && !step.finishedAt ? `${label}…` : label;
}

const API_OPERATION_STEP_LABELS: Record<string, string> = {
  "ai.enhance.generate_object": "ai_jd_extract",
  "ai.enhance.generate_text": "ai_pass1",
};

export function pipelineStepLabelForApiOperation(operation: string): string {
  return API_OPERATION_STEP_LABELS[operation] ?? operation;
}
