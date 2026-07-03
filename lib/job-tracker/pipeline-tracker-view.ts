import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { alignPipelineDebugWithJobTruth } from "@/lib/extension/pipeline-debug-display";
import {
  parsePipelineDebugProgress,
  PIPELINE_DEBUG_STEP_DEFS,
  type PipelineDebugProgress,
  type PipelineDebugStep,
  type PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";
import {
  pipelineProgressForStatus,
  type PipelineProgress,
} from "@/lib/job-tracker/pipeline-progress";
import {
  applyPipelineStageLabelFromTrackerStage,
  resolveApplyPipelineUserMessage,
  type ApplyPipelineUserMessage,
} from "@/src/shared/extension/apply-pipeline-user-messages";

/** Tracker kanban stage 1 — job saved from extension or dashboard. */
export type PipelineTrackerStage = "capture" | "resume_prep" | "ready";

export type PipelineTrackerStageMeta = {
  id: PipelineTrackerStage;
  /** Matches pipeline bar segment 1–3 (not Applied). */
  segmentIndex: 1 | 2 | 3;
  title: string;
};

export const PIPELINE_TRACKER_STAGES: Record<PipelineTrackerStage, PipelineTrackerStageMeta> = {
  capture: {
    id: "capture",
    segmentIndex: 1,
    title: applyPipelineStageLabelFromTrackerStage("capture"),
  },
  resume_prep: {
    id: "resume_prep",
    segmentIndex: 2,
    title: applyPipelineStageLabelFromTrackerStage("resume_prep"),
  },
  ready: {
    id: "ready",
    segmentIndex: 3,
    title: applyPipelineStageLabelFromTrackerStage("ready"),
  },
};

const STEP_TRACKER_STAGE = new Map<string, PipelineTrackerStage>(
  PIPELINE_DEBUG_STEP_DEFS.map((def) => [
    def.id,
    def.trackerStage,
  ]),
);

const STEP_ORDER = new Map(
  PIPELINE_DEBUG_STEP_DEFS.map((def, index) => [def.id, index] as const),
);

export function pipelineStepTrackerStage(stepId: string): PipelineTrackerStage | null {
  return STEP_TRACKER_STAGE.get(stepId) ?? null;
}

export function pipelineStepsForTrackerStage(stage: PipelineTrackerStage): string[] {
  return PIPELINE_DEBUG_STEP_DEFS.filter((def) => def.trackerStage === stage).map(
    (def) => def.id,
  );
}

export type PipelineStepFailure = {
  stepId: string;
  label: string;
  detail: string;
  stage: PipelineTrackerStage;
  stageTitle: string;
};

function isTerminalStatus(status: PipelineDebugStepStatus): boolean {
  return (
    status === "done" ||
    status === "skipped" ||
    status === "warning" ||
    status === "error"
  );
}

function readPipelineDebug(metadata: unknown): PipelineDebugProgress | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const row = metadata as Record<string, unknown>;
  return parsePipelineDebugProgress(row.pipelineDebug);
}

/** First blocking step failure in pipeline order. */
export function findPipelineStepFailure(
  progress: PipelineDebugProgress | null | undefined,
): PipelineStepFailure | null {
  if (!progress) return null;

  for (const def of PIPELINE_DEBUG_STEP_DEFS) {
    const step = progress.steps.find((row) => row.id === def.id);
    if (!step || step.status !== "error") continue;

    const stage = def.trackerStage;
    return {
      stepId: step.id,
      label: step.label,
      detail: step.detail?.trim() || "Step failed",
      stage,
      stageTitle: PIPELINE_TRACKER_STAGES[stage].title,
    };
  }

  return null;
}

/**
 * Status advanced to Auto Suggest while capture/resume steps never finished —
 * usually a race in debug writes, not a real pipeline success.
 */
export function findPipelineStageInconsistency(
  progress: PipelineDebugProgress | null | undefined,
  status: JobTrackerStatus,
): PipelineStepFailure | null {
  if (!progress || (status !== "READY_TO_APPLY" && status !== "APPLIED")) return null;

  const statusReady = progress.steps.find((row) => row.id === "status_ready");
  if (statusReady?.status !== "done") return null;

  for (const def of PIPELINE_DEBUG_STEP_DEFS) {
    if (def.trackerStage === "ready") continue;
    const step = progress.steps.find((row) => row.id === def.id);
    if (!step) continue;
    if (step.status === "pending" || step.status === "active") {
      const stage = def.trackerStage;
      return {
        stepId: step.id,
        label: step.label,
        detail: step.detail?.trim() || "Step did not complete",
        stage,
        stageTitle: PIPELINE_TRACKER_STAGES[stage].title,
      };
    }
  }

  return null;
}

export function resolvePipelineStepFailureFromMetadata(
  metadata: unknown,
  status: JobTrackerStatus,
): PipelineStepFailure | null {
  const raw = readPipelineDebug(metadata);
  const progress = raw ? alignPipelineDebugWithJobTruth(raw, metadata, status) : null;
  return (
    findPipelineStepFailure(progress) ??
    findPipelineStageInconsistency(progress, status)
  );
}

function activePipelineStep(
  progress: PipelineDebugProgress | null | undefined,
): PipelineDebugStep | null {
  if (!progress) return null;

  let best: PipelineDebugStep | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const step of progress.steps) {
    if (step.status !== "active") continue;
    const index = STEP_ORDER.get(step.id);
    if (index === undefined || index >= bestIndex) continue;
    best = step;
    bestIndex = index;
  }

  return best;
}

export type TrackerPipelineView = {
  progress: PipelineProgress;
  subLabel: string | null;
  userMessage: ApplyPipelineUserMessage;
  hasPipelineFailure: boolean;
  hasWarning: boolean;
  failure: PipelineStepFailure | null;
  activeStepLabel: string | null;
};

export type ResolveTrackerPipelineViewInput = {
  status: JobTrackerStatus;
  metadata?: unknown;
  issueMessage?: string | null;
  stepFailure?: PipelineStepFailure | null;
  hasError?: boolean;
  extensionInstalled?: boolean;
  appliedSource?: string | null;
};

function progressForStageFailure(failure: PipelineStepFailure): PipelineProgress {
  const segment = PIPELINE_TRACKER_STAGES[failure.stage].segmentIndex;
  return {
    filledThrough: Math.max(0, segment - 1),
    currentIndex: segment,
    isComplete: false,
  };
}

/** Map DB status + pipeline debug steps → tracker bar + sub-label. */
export function resolveTrackerPipelineView(
  input: ResolveTrackerPipelineViewInput,
): TrackerPipelineView {
  const progress = readPipelineDebug(input.metadata);
  const failure =
    input.stepFailure ??
    findPipelineStepFailure(progress) ??
    findPipelineStageInconsistency(progress, input.status);

  const userMessage = resolveApplyPipelineUserMessage({
    status: input.status,
    progress,
    stepFailure: failure,
    issueMessage: input.issueMessage,
    metadata: input.metadata,
    extensionInstalled: input.extensionInstalled,
  });

  if (failure || userMessage.kind === "error") {
    return {
      progress: failure ? progressForStageFailure(failure) : pipelineProgressForStatus(input.status),
      subLabel: userMessage.line,
      userMessage,
      hasPipelineFailure: userMessage.kind === "error",
      hasWarning: userMessage.kind === "warning",
      failure,
      activeStepLabel: null,
    };
  }

  if (userMessage.kind === "warning") {
    return {
      progress: pipelineProgressForStatus(input.status),
      subLabel: userMessage.line,
      userMessage,
      hasPipelineFailure: false,
      hasWarning: true,
      failure: null,
      activeStepLabel: null,
    };
  }

  const running = activePipelineStep(progress);
  if (running && input.status === "CAPTURED") {
    const stage = pipelineStepTrackerStage(running.id);
    const segment = stage ? PIPELINE_TRACKER_STAGES[stage].segmentIndex : 2;
    return {
      progress: {
        filledThrough: Math.max(0, segment - 1),
        currentIndex: segment,
        isComplete: false,
      },
      subLabel: userMessage.line,
      userMessage,
      hasPipelineFailure: false,
      hasWarning: false,
      failure: null,
      activeStepLabel: null,
    };
  }

  return {
    progress: pipelineProgressForStatus(input.status),
    subLabel: userMessage.line,
    userMessage,
    hasPipelineFailure: false,
    hasWarning: false,
    failure: null,
    activeStepLabel: null,
  };
}
