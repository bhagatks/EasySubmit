import {
  PIPELINE_DEBUG_STEP_DEFS,
  type PipelineDebugProgress,
  type PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";

const STEP_INDEX = new Map(
  PIPELINE_DEBUG_STEP_DEFS.map((def, index) => [def.id, index] as const),
);

function isTerminalStatus(status: PipelineDebugStepStatus): boolean {
  return (
    status === "done" ||
    status === "skipped" ||
    status === "warning" ||
    status === "error"
  );
}

function hasPipelineStepErrors(progress: PipelineDebugProgress): boolean {
  return progress.steps.some((step) => step.status === "error");
}

/** Fill in stale pending/active steps before the furthest completed step. */
export function reconcilePipelineDebugProgress(
  progress: PipelineDebugProgress,
): PipelineDebugProgress {
  if (hasPipelineStepErrors(progress)) return progress;

  const now = new Date().toISOString();
  let maxFinishedIndex = -1;

  for (const step of progress.steps) {
    const index = STEP_INDEX.get(step.id);
    if (index === undefined || !isTerminalStatus(step.status)) continue;
    maxFinishedIndex = Math.max(maxFinishedIndex, index);
  }

  if (maxFinishedIndex < 0) return progress;

  const steps = progress.steps.map((step) => {
    const index = STEP_INDEX.get(step.id);
    if (index === undefined || index >= maxFinishedIndex) return step;
    if (step.status !== "pending" && step.status !== "active") return step;

    return {
      ...step,
      status: "done" as const,
      detail: step.detail ?? "Completed",
      startedAt: step.startedAt ?? step.finishedAt ?? now,
      finishedAt: step.finishedAt ?? now,
    };
  });

  return { ...progress, updatedAt: now, steps };
}

/** Mark any remaining non-terminal steps done when pipeline reaches READY_TO_APPLY. */
export function finalizePipelineDebugProgress(
  progress: PipelineDebugProgress,
): PipelineDebugProgress {
  if (hasPipelineStepErrors(progress)) return progress;

  const now = new Date().toISOString();
  const steps = progress.steps.map((step) => {
    if (isTerminalStatus(step.status)) return step;
    return {
      ...step,
      status: "done" as const,
      detail: step.detail ?? "Completed",
      startedAt: step.startedAt ?? step.finishedAt ?? now,
      finishedAt: step.finishedAt ?? now,
    };
  });
  return reconcilePipelineDebugProgress({ ...progress, updatedAt: now, steps });
}

const writeChains = new Map<string, Promise<void>>();

export function runSerializedPipelineDebugWrite(
  entryId: string,
  task: () => Promise<void>,
): Promise<void> {
  const previous = writeChains.get(entryId) ?? Promise.resolve();
  const next = previous.then(task, task);
  writeChains.set(entryId, next);
  void next.finally(() => {
    if (writeChains.get(entryId) === next) {
      writeChains.delete(entryId);
    }
  });
  return next;
}

/** @internal test helper */
export function resetPipelineDebugWriteQueueForTests(): void {
  writeChains.clear();
}
