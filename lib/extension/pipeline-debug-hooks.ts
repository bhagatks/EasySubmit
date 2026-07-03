import {
  advancePipelineDebugStep,
  setPipelineDebugStep,
  type PipelineDebugStepUpdate,
} from "@/lib/extension/pipeline-debug-progress";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

export type PipelineDebugHookContext = {
  userId: string;
  entryId: string;
};

function ctxReady(ctx?: PipelineDebugHookContext | null): ctx is PipelineDebugHookContext {
  return Boolean(ctx?.userId && ctx?.entryId);
}

/** Fire-and-forget debug overlay update — never blocks the pipeline. */
export function pipelineDebugStep(
  ctx: PipelineDebugHookContext | null | undefined,
  stepId: string,
  update: PipelineDebugStepUpdate,
): void {
  if (!isPipelineDebugEnabled()) return;
  if (!ctxReady(ctx)) return;
  void setPipelineDebugStep(ctx.userId, ctx.entryId, stepId, update).catch(() => undefined);
}

export function pipelineDebugAdvance(
  ctx: PipelineDebugHookContext | null | undefined,
  activeStepId: string,
  completeStepId?: string,
  completeUpdate?: PipelineDebugStepUpdate,
): void {
  if (!isPipelineDebugEnabled()) return;
  if (!ctxReady(ctx)) return;
  void advancePipelineDebugStep(
    ctx.userId,
    ctx.entryId,
    activeStepId,
    completeStepId,
    completeUpdate,
  ).catch(() => undefined);
}

export function pipelineDebugContext(
  userId: string | undefined,
  entryId: string | undefined,
): PipelineDebugHookContext | null {
  if (!userId || !entryId) return null;
  return { userId, entryId };
}
