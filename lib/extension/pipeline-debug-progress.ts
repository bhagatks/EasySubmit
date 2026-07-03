import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isApplyPipelineStepAnalyticsEnabled } from "@/lib/extension/apply-pipeline-step-analytics";
import {
  captureApplyPipelineStarted,
  captureApplyPipelineStep,
} from "@/src/shared/analytics/server-pipeline-step-capture";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";
import {
  emptyPipelineDebugProgress,
  parsePipelineDebugProgress,
  PIPELINE_DEBUG_METADATA_KEY,
  type PipelineDebugProgress,
  type PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";

export type PipelineDebugStepUpdate = {
  status?: PipelineDebugStepStatus;
  detail?: string;
  meta?: Record<string, unknown>;
};

function readMetadataObject(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>) };
  }
  return {};
}

function touchStep(
  progress: PipelineDebugProgress,
  stepId: string,
  update: PipelineDebugStepUpdate,
): PipelineDebugProgress {
  const now = new Date().toISOString();
  const steps = progress.steps.map((step) => {
    if (step.id !== stepId) return step;

    const nextStatus = update.status ?? step.status;
    const startedAt =
      nextStatus === "active" && !step.startedAt ? now : step.startedAt;
    const finishedAt =
      nextStatus === "done" ||
      nextStatus === "skipped" ||
      nextStatus === "error"
        ? now
        : step.finishedAt;

    return {
      ...step,
      status: nextStatus,
      startedAt,
      finishedAt,
      detail: update.detail !== undefined ? update.detail : step.detail,
      meta:
        update.meta !== undefined
          ? { ...(step.meta ?? {}), ...update.meta }
          : step.meta,
    };
  });

  return { ...progress, updatedAt: now, steps };
}

function emitApplyPipelineStepAnalytics(
  userId: string,
  entryId: string,
  progress: PipelineDebugProgress,
  stepId: string,
): void {
  const step = progress.steps.find((row) => row.id === stepId);
  if (!step || step.status === "pending") return;

  captureApplyPipelineStep({
    userId,
    entryId,
    traceId: progress.traceId,
    stepId: step.id,
    status: step.status,
    detail: step.detail,
    meta: step.meta,
  });
}

function emitApplyPipelineStepFromUpdate(
  userId: string,
  entryId: string,
  traceId: string,
  stepId: string,
  update: PipelineDebugStepUpdate,
): void {
  const status = update.status;
  if (!status || status === "pending") return;

  captureApplyPipelineStep({
    userId,
    entryId,
    traceId,
    stepId,
    status,
    detail: update.detail,
    meta: update.meta,
  });
}

async function writePipelineDebugProgress(
  userId: string,
  entryId: string,
  progress: PipelineDebugProgress,
): Promise<void> {
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  if (!row) return;

  const metadata = readMetadataObject(row.metadata);
  metadata[PIPELINE_DEBUG_METADATA_KEY] = progress;

  await prisma.jobTrackerEntry.updateMany({
    where: { id: entryId, userId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}

/** Initialize debug step list on a job row (idempotent — keeps existing progress if present). */
export async function initPipelineDebugProgress(
  userId: string,
  entryId: string,
  traceId: string,
): Promise<void> {
  const overlayOn = isPipelineDebugEnabled();
  const analyticsOn = await isApplyPipelineStepAnalyticsEnabled();
  if (!overlayOn && !analyticsOn) return;

  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  if (!row) return;

  const metadata = readMetadataObject(row.metadata);
  const existing = parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY]);
  if (existing) return;

  if (overlayOn) {
    const progress = emptyPipelineDebugProgress(traceId);
    await writePipelineDebugProgress(userId, entryId, progress);
  }

  if (analyticsOn) {
    captureApplyPipelineStarted({ userId, entryId, traceId });
  }
}

export async function setPipelineDebugStep(
  userId: string,
  entryId: string,
  stepId: string,
  update: PipelineDebugStepUpdate,
): Promise<void> {
  const overlayOn = isPipelineDebugEnabled();
  const analyticsOn = await isApplyPipelineStepAnalyticsEnabled();
  if (!overlayOn && !analyticsOn) return;

  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  if (!row) return;

  const metadata = readMetadataObject(row.metadata);
  const existingProgress = parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY]);
  const traceId = existingProgress?.traceId ?? entryId;

  if (overlayOn) {
    let progress = existingProgress ?? emptyPipelineDebugProgress(traceId);
    progress = touchStep(progress, stepId, update);
    await writePipelineDebugProgress(userId, entryId, progress);
    if (analyticsOn) {
      emitApplyPipelineStepAnalytics(userId, entryId, progress, stepId);
    }
    return;
  }

  if (analyticsOn) {
    emitApplyPipelineStepFromUpdate(userId, entryId, traceId, stepId, update);
  }
}

export async function getPipelineDebugProgress(
  userId: string,
  entryId: string,
): Promise<PipelineDebugProgress | null> {
  if (!isPipelineDebugEnabled()) return null;
  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  if (!row) return null;

  const metadata = readMetadataObject(row.metadata);
  return parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY]);
}

/** Mark step active and optionally complete a prior step in one write. */
export async function advancePipelineDebugStep(
  userId: string,
  entryId: string,
  activeStepId: string,
  completeStepId?: string,
  completeUpdate?: PipelineDebugStepUpdate,
): Promise<void> {
  const overlayOn = isPipelineDebugEnabled();
  const analyticsOn = await isApplyPipelineStepAnalyticsEnabled();
  if (!overlayOn && !analyticsOn) return;

  const row = await prisma.jobTrackerEntry.findFirst({
    where: { id: entryId, userId },
    select: { metadata: true },
  });
  if (!row) return;

  const metadata = readMetadataObject(row.metadata);
  const existingProgress = parsePipelineDebugProgress(metadata[PIPELINE_DEBUG_METADATA_KEY]);
  const traceId = existingProgress?.traceId ?? entryId;

  if (overlayOn) {
    let progress = existingProgress ?? emptyPipelineDebugProgress(traceId);

    if (completeStepId) {
      progress = touchStep(progress, completeStepId, {
        status: "done",
        ...completeUpdate,
      });
      if (analyticsOn) {
        emitApplyPipelineStepAnalytics(userId, entryId, progress, completeStepId);
      }
    }

    progress = touchStep(progress, activeStepId, { status: "active" });
    await writePipelineDebugProgress(userId, entryId, progress);
    if (analyticsOn) {
      emitApplyPipelineStepAnalytics(userId, entryId, progress, activeStepId);
    }
    return;
  }

  if (analyticsOn) {
    if (completeStepId) {
      emitApplyPipelineStepFromUpdate(userId, entryId, traceId, completeStepId, {
        status: "done",
        ...completeUpdate,
      });
    }
    emitApplyPipelineStepFromUpdate(userId, entryId, traceId, activeStepId, {
      status: "active",
    });
  }
}
