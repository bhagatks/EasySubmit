import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import {
  PIPELINE_DEBUG_STEP_DEFS,
  type PipelineDebugProgress,
  type PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";
import {
  finalizePipelineDebugProgress,
  reconcilePipelineDebugProgress,
} from "@/lib/extension/pipeline-debug-progress-sync";

function readMetadataObject(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

function readMetadataPipelineError(metadata: unknown): string | null {
  const row = readMetadataObject(metadata);
  if (!row) return null;
  const pipelineError = row.pipelineError;
  if (typeof pipelineError === "string" && pipelineError.trim()) return pipelineError.trim();
  const lastError = row.lastError;
  if (typeof lastError === "string" && lastError.trim()) return lastError.trim();
  return null;
}

const STEP_DEF_BY_ID = new Map(PIPELINE_DEBUG_STEP_DEFS.map((def) => [def.id, def] as const));

function normalizePipelineDebugArtifactLabel(_stepId: string, label: string): string {
  return label;
}

/** Stored rows keep old copy — always show current canonical step + artifact labels in QA UI. */
export function refreshPipelineDebugLabelsForDisplay(
  progress: PipelineDebugProgress,
): PipelineDebugProgress {
  return {
    ...progress,
    steps: progress.steps.map((step) => {
      const def = STEP_DEF_BY_ID.get(step.id);
      const artifacts = step.artifacts?.map((artifact) => ({
        ...artifact,
        label: normalizePipelineDebugArtifactLabel(step.id, artifact.label),
      }));
      if (!def) return { ...step, artifacts };
      return {
        ...step,
        label: def.label,
        description: def.description,
        group: def.group,
        trackerStage: def.trackerStage,
        artifacts,
      };
    }),
  };
}

function firstPipelineErrorStep(progress: PipelineDebugProgress): {
  stepId: string;
  label: string;
  detail: string;
} | null {
  for (const def of PIPELINE_DEBUG_STEP_DEFS) {
    const step = progress.steps.find((row) => row.id === def.id);
    if (!step || step.status !== "error") continue;
    return {
      stepId: step.id,
      label: step.label,
      detail: step.detail?.trim() || "Step failed",
    };
  }
  return null;
}

/** Reconcile stale rows where status_ready is done but a step failed or metadata records an error. */
export function alignPipelineDebugWithJobTruth(
  progress: PipelineDebugProgress,
  metadata: unknown,
  _status: JobTrackerStatus,
): PipelineDebugProgress {
  const now = new Date().toISOString();
  let steps = [...progress.steps];
  let failure = firstPipelineErrorStep({ ...progress, steps });

  const metadataError = readMetadataPipelineError(metadata);
  if (!failure && metadataError) {
    const targetId =
      steps.find((step) => step.id === "ai_pass1")?.id ??
      steps.find((step) => step.trackerStage === "resume_prep" && step.status !== "skipped")?.id ??
      "ai_pass1";
    steps = steps.map((step) =>
      step.id === targetId
        ? {
            ...step,
            status: "error" as const,
            detail: metadataError,
            finishedAt: step.finishedAt ?? now,
          }
        : step,
    );
    failure = firstPipelineErrorStep({ ...progress, steps });
  }

  if (failure) {
    const failedIndex = PIPELINE_DEBUG_STEP_DEFS.findIndex((def) => def.id === failure!.stepId);
    steps = steps.map((step, index) => {
      const def = STEP_DEF_BY_ID.get(step.id);
      if (!def) return step;

      if (step.id === failure!.stepId && step.status !== "error") {
        return {
          ...step,
          status: "error" as const,
          detail: step.detail ?? failure!.detail,
          finishedAt: step.finishedAt ?? now,
        };
      }

      if (step.id === "status_ready" && (step.status === "done" || step.status === "active")) {
        return {
          ...step,
          status: "error" as const,
          detail: `Blocked — ${failure!.label}`,
          finishedAt: step.finishedAt ?? now,
        };
      }

      if (index > failedIndex && (step.status === "done" || step.status === "active")) {
        return {
          ...step,
          status: "pending" as const,
          detail: undefined,
          finishedAt: undefined,
        };
      }

      return step;
    });

    return reconcilePipelineDebugProgress({ ...progress, updatedAt: now, steps });
  }

  return progress;
}

function hasPipelineStepErrors(progress: PipelineDebugProgress): boolean {
  return progress.steps.some((step) => step.status === "error");
}

/** Normalize stored progress for dashboard QA (heals races; never hides failures). */
export function resolvePipelineDebugProgressForDisplay(
  progress: PipelineDebugProgress,
  metadata?: unknown,
  status?: JobTrackerStatus,
): PipelineDebugProgress {
  let resolved = progress;
  if (metadata !== undefined && status !== undefined) {
    resolved = alignPipelineDebugWithJobTruth(resolved, metadata, status);
  }

  resolved = reconcilePipelineDebugProgress(resolved);
  const statusReady = resolved.steps.find((step) => step.id === "status_ready");
  if (statusReady?.status === "done" && !hasPipelineStepErrors(resolved)) {
    resolved = finalizePipelineDebugProgress(resolved);
  }
  return refreshPipelineDebugLabelsForDisplay(resolved);
}

export function pipelineDebugProgressSignature(progress: PipelineDebugProgress | null): string {
  if (!progress) return "";
  return progress.steps
    .map(
      (step) =>
        `${step.id}:${step.status}:${step.detail ?? ""}:${step.artifacts?.length ?? 0}`,
    )
    .join("|");
}

export function isTerminalStepStatus(status: PipelineDebugStepStatus): boolean {
  return (
    status === "done" ||
    status === "skipped" ||
    status === "warning" ||
    status === "error"
  );
}

/** True when no step is actively running — safe to poll slowly. */
export function isPipelineDebugPollingIdle(progress: PipelineDebugProgress | null): boolean {
  if (!progress) return false;
  if (progress.steps.some((step) => step.status === "active")) return false;
  return progress.steps.every((step) => isTerminalStepStatus(step.status));
}
