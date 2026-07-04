import { resolveEnhanceTraceOutcome } from "@/lib/ai/enhance-trace-outcome";
import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";
import {
  buildPipelineStepViewModel,
  pairPipelineApiArtifacts,
  type PipelineApiExchange,
} from "@/src/shared/extension/pipeline-debug-step-view";
import {
  computeStepDurationMs,
  formatDurationMinSec,
  formatStepDurationLabel,
  pipelineStepLabelForApiOperation,
} from "@/src/shared/extension/pipeline-debug-duration";
import type {
  PipelineDebugProgress,
  PipelineDebugStep,
  PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";

export type PipelineApiLogRow = {
  id: string;
  traceId: string | null;
  createdAt: string;
  operation: string;
  status: string;
  provider: string | null;
  modelId: string | null;
  durationMs: number;
  tokensUsed: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  aiMode: string | null;
  metadata: Record<string, unknown> | null;
};

export type PipelineRunContext = {
  jobId: string;
  title: string;
  company: string | null;
  platform: string | null;
  status: string;
  savedAt: string;
  traceId: string | null;
  enhanceMeta: Record<string, unknown> | null;
  jdSource: string | null;
  jdConfidence: number | null;
  jdMustHaveSkills: number;
  vocabSkills: number;
  vocabSource: string | null;
};

export type PipelinePhaseId =
  | "capture"
  | "parallel"
  | "join"
  | "fallback"
  | "ai"
  | "persist";

export type PipelinePhaseView = {
  id: PipelinePhaseId;
  label: string;
  hint: string;
  steps: PipelineStepInsight[];
  durationMs: number;
  status: PipelineDebugStepStatus;
};

export type PipelineStepDecision = {
  label: string;
  value: string;
};

export type PipelineStepInsight = {
  id: string;
  label: string;
  group: string;
  status: PipelineDebugStepStatus;
  durationLabel: string | null;
  durationMs: number | null;
  /** One-line SRE headline — what happened. */
  headline: string;
  /** Plain-language story for operators. */
  story: string;
  decisions: PipelineStepDecision[];
  changes: string[];
  apiExchanges: PipelineApiExchange[];
  linkedLogs: PipelineApiLogRow[];
  meta: Array<{ key: string; value: string }>;
  artifacts: PipelineDebugArtifact[];
};

export type PipelineRunOverview = {
  traceId: string | null;
  outcome: string;
  wallClockMs: number | null;
  wallClockLabel: string | null;
  totalTokens: number;
  apiCallCount: number;
  modelsUsed: string[];
  readinessBefore: number | null;
  readinessAfter: number | null;
  engineMode: string | null;
  aiAttempted: boolean;
  aiSucceeded: boolean;
  warning: string | null;
  pathLabel: string;
  jdIntel: PipelineRunJdIntel;
};

export type PipelineRunJdIntel = {
  source: string;
  confidence: string;
  vocabSkills: number;
  mustHaveSkills: number;
};

export type PipelineRunView = {
  overview: PipelineRunOverview;
  phases: PipelinePhaseView[];
  traceLog: PipelineApiLogRow[];
  timeline: Array<{
    stepId: string;
    label: string;
    status: PipelineDebugStepStatus;
    startMs: number;
    durationMs: number;
    parallel: boolean;
  }>;
};

const PHASE_DEFS: Array<{
  id: PipelinePhaseId;
  label: string;
  hint: string;
  stepIds: string[];
  hideWhenAllSkipped?: boolean;
}> = [
  {
    id: "capture",
    label: "Capture",
    hint: "Extension scrape validated and job row saved",
    stepIds: ["capture_validate", "capture_save"],
  },
  {
    id: "parallel",
    label: "Parallel prep",
    hint: "Job track (JD) and resume track run together from capture",
    stepIds: [
      "profile_load",
      "pre_jd_skills",
      "pre_jd_brain",
      "ai_jd_extract",
      "pre_rules",
      "pre_resume_context",
    ],
  },
  {
    id: "join",
    label: "Join & merge",
    hint: "Tracks meet — light skills merge before resume AI",
    stepIds: ["pre_validate", "pre_skills_merge"],
  },
  {
    id: "fallback",
    label: "Full brief fallback",
    hint: "Only when resume AI fails — keyword gap, directive, plan",
    stepIds: ["pre_intelligence", "pre_keyword_gap", "pre_directive", "pre_plan"],
    hideWhenAllSkipped: true,
  },
  {
    id: "ai",
    label: "AI enhance",
    hint: "Gates, baseline, max-ATS generateText",
    stepIds: ["ai_gates", "baseline", "ai_pass1", "ai_pass2"],
  },
  {
    id: "persist",
    label: "Persist",
    hint: "Post-process rules and job-scoped resume overrides",
    stepIds: ["post_process", "persist_overrides", "status_ready"],
  },
];

const PARALLEL_STEP_IDS = new Set([
  "pre_jd_skills",
  "pre_jd_brain",
  "ai_jd_extract",
  "pre_rules",
  "pre_resume_context",
  "profile_load",
]);

function phaseStatus(steps: PipelineStepInsight[]): PipelineDebugStepStatus {
  if (steps.some((s) => s.status === "error")) return "error";
  if (steps.some((s) => s.status === "active")) return "active";
  if (steps.some((s) => s.status === "warning")) return "warning";
  if (steps.every((s) => s.status === "skipped")) return "skipped";
  if (steps.every((s) => s.status === "pending")) return "pending";
  return "done";
}

function parseChangedSections(detail: string | undefined): string[] {
  if (!detail) return [];
  const match = detail.match(/Changed:\s*(.+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function metaRows(meta: Record<string, unknown> | undefined): Array<{ key: string; value: string }> {
  if (!meta) return [];
  return Object.entries(meta).map(([key, value]) => ({
    key,
    value:
      value == null
        ? "—"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value),
  }));
}

function logsForStep(stepId: string, logs: PipelineApiLogRow[]): PipelineApiLogRow[] {
  return logs.filter((log) => pipelineStepLabelForApiOperation(log.operation) === stepId);
}

function buildStepHeadline(step: PipelineDebugStep, ctx: PipelineRunContext): string {
  const detail = step.detail?.trim() ?? "";
  switch (step.id) {
    case "capture_validate":
      return detail || "Capture payload validated";
    case "capture_save":
      return detail || "Job saved to tracker";
    case "profile_load":
      return detail ? `Profile loaded — ${detail}` : "Base profile loaded";
    case "pre_validate":
      return detail || "Input validated for tailor";
    case "pre_jd_skills":
      return detail || "JD skills vocabulary fetched";
    case "pre_jd_brain":
      return detail || "Deterministic JD intelligence extracted";
    case "ai_jd_extract":
      if (step.status === "skipped") {
        if (detail.includes("ai_jd_extract_enabled")) return "JD AI skipped — feature flag OFF";
        if (detail.includes("cached")) return "JD AI skipped — intelligence cache hit";
        if (detail.includes("Quota")) return "JD AI blocked — quota";
        if (detail.includes("No AI route")) return "JD AI skipped — no AI route";
        return detail || "JD AI extract skipped";
      }
      if (step.status === "done") {
        const model = (step.meta?.modelId as string) ?? detail;
        return model ? `JD structured extract — ${model}` : "JD AI extract complete";
      }
      return detail || "JD AI extract";
    case "pre_skills_merge":
      return detail || "Light-path skills merged";
    case "ai_gates":
      return detail || "Enhance feature gates evaluated";
    case "ai_pass1":
      if (step.status === "done") return detail || "Resume max-ATS AI complete";
      return detail || "Resume AI pass";
    case "persist_overrides":
      return detail || "Job resume overrides saved";
    case "status_ready":
      return detail || `Job status → ${ctx.status}`;
    default:
      return detail || step.label;
  }
}

function buildStepStory(step: PipelineDebugStep, ctx: PipelineRunContext): string {
  const detail = step.detail?.trim() ?? "";
  const meta = step.meta ?? {};

  switch (step.id) {
    case "pre_jd_brain":
      return `Deterministic JD parse finished. Intelligence source=${ctx.jdSource ?? "unknown"}, confidence=${ctx.jdConfidence ?? "—"}, tier1=${typeof meta.tier1Count === "number" ? meta.tier1Count : "—"}.`;
    case "pre_jd_skills":
      return `Skills vocabulary: ${ctx.vocabSkills} skills from ${ctx.vocabSource ?? "unknown"}. Used for light merge and enhance prompt.`;
    case "ai_jd_extract":
      if (step.status === "skipped") {
        if (detail.includes("ai_jd_extract_enabled")) {
          return `No generateObject JD call. Pipeline used deterministic intelligence (${ctx.jdMustHaveSkills} must-have skills, confidence ${ctx.jdConfidence ?? "—"}) plus ESCO vocabulary only.`;
        }
        if (detail.includes("cached")) {
          return "Prior JD intelligence reused — hash match on job row, no new AI spend.";
        }
        if (detail.includes("No AI route")) {
          return "AI route unavailable (BYOK/system off or quota). Deterministic JD floor only.";
        }
        return detail || "JD structured extract did not run.";
      }
      if (step.status === "done") {
        const tokens = meta.tokensUsed ?? "—";
        const attempts = meta.attemptCount ?? 1;
        return `Structured JD extract succeeded (${attempts} attempt(s), ${tokens} tokens). Merged into hybrid intelligence for enhance brief.`;
      }
      return detail || step.description;
    case "pre_skills_merge":
      return "Job must-have skills merged into working resume form — base profile unchanged until persist.";
    case "ai_gates":
      if (step.status === "skipped") return "Surface or settings skip AI for this run.";
      return "resolveFeature(enhance) passed — BYOK or system route available for resume AI.";
    case "ai_pass1":
      if (step.status === "skipped") return detail || "Resume AI did not run.";
      if (step.status === "done") {
        const delta = ctx.enhanceMeta?.readinessDelta as { before?: number; after?: number } | undefined;
        const readiness =
          delta?.before != null && delta?.after != null
            ? ` Readiness ${delta.before}→${delta.after}.`
            : "";
        return `Single max-ATS generateText pass updated summary and experience bullets.${readiness}`;
      }
      return detail || step.description;
    case "persist_overrides":
      const sections = parseChangedSections(detail);
      if (sections.length) {
        return `Wrote job-scoped overrides for: ${sections.join(", ")}. Base profile in studio unchanged.`;
      }
      return "Persisted tailor output to job_resume_tailors.";
    case "pre_intelligence":
    case "pre_keyword_gap":
    case "pre_directive":
    case "pre_plan":
      if (step.status === "skipped") {
        return "Happy path — resume AI succeeded so full brief was not built.";
      }
      return detail || step.description;
    default:
      return detail || step.description;
  }
}

function buildStepDecisions(step: PipelineDebugStep, ctx: PipelineRunContext): PipelineStepDecision[] {
  const decisions: PipelineStepDecision[] = [];
  const meta = step.meta ?? {};

  if (step.id === "ai_jd_extract" && step.status === "skipped") {
    const detail = step.detail ?? "";
    if (detail.includes("ai_jd_extract_enabled")) {
      decisions.push({ label: "ai_jd_extract_enabled", value: "OFF" });
    }
    if (detail.includes("cached")) {
      decisions.push({ label: "jd_cache", value: "HIT" });
    }
    if (detail.includes("No AI route")) {
      decisions.push({ label: "ai_route", value: "NONE" });
    }
  }

  if (step.id === "ai_gates" && meta) {
    if (meta.routeMode) decisions.push({ label: "route", value: String(meta.routeMode) });
    if (meta.modelId) decisions.push({ label: "model", value: String(meta.modelId) });
  }

  if (step.id === "ai_pass1" && step.status === "done") {
    if (meta.modelId) decisions.push({ label: "model", value: String(meta.modelId) });
    if (meta.routeMode) decisions.push({ label: "route", value: String(meta.routeMode) });
    if (meta.optimizationMode) {
      decisions.push({ label: "optimization", value: String(meta.optimizationMode) });
    }
  }

  if (step.id === "pre_jd_brain") {
    decisions.push({ label: "jd_source", value: ctx.jdSource ?? "unknown" });
    if (ctx.jdConfidence != null) {
      decisions.push({ label: "confidence", value: ctx.jdConfidence.toFixed(2) });
    }
  }

  return decisions;
}

function buildStepInsight(
  step: PipelineDebugStep,
  ctx: PipelineRunContext,
  logs: PipelineApiLogRow[],
): PipelineStepInsight {
  const view = buildPipelineStepViewModel(step);
  const linkedLogs = logsForStep(step.id, logs);
  const durationMs = computeStepDurationMs(step);

  return {
    id: step.id,
    label: step.label,
    group: step.group,
    status: step.status,
    durationLabel: formatStepDurationLabel(step),
    durationMs,
    headline: buildStepHeadline(step, ctx),
    story: buildStepStory(step, ctx),
    decisions: buildStepDecisions(step, ctx),
    changes: parseChangedSections(step.detail),
    apiExchanges: view.apiExchanges.length > 0 ? view.apiExchanges : pairPipelineApiArtifacts(
      linkedLogs.flatMap((log) => {
        const artifacts: PipelineDebugArtifact[] = [];
        if (log.metadata?.requestPreview || log.metadata?.systemPreview) {
          artifacts.push({
            kind: "ai_request",
            label: `${log.operation} request`,
            payload: {
              modelId: log.modelId,
              operation: log.operation,
              ...(log.metadata ?? {}),
            },
          });
        }
        return artifacts;
      }),
    ),
    linkedLogs,
    meta: metaRows(step.meta),
    artifacts: [...view.outcomeArtifacts, ...view.otherArtifacts],
  };
}

function buildOverview(
  progress: PipelineDebugProgress,
  ctx: PipelineRunContext,
  logs: PipelineApiLogRow[],
): PipelineRunOverview {
  const started = Date.parse(progress.startedAt);
  const ended = Date.parse(progress.updatedAt);
  const wallClockMs =
    Number.isFinite(started) && Number.isFinite(ended) && ended >= started
      ? ended - started
      : null;

  const enhanceLogs = logs.filter((l) => l.operation.startsWith("ai.enhance"));
  const totalTokens = logs.reduce((sum, l) => sum + (l.tokensUsed ?? 0), 0);
  const modelsUsed = [...new Set(logs.map((l) => l.modelId).filter(Boolean))] as string[];

  const meta = ctx.enhanceMeta ?? {};
  const readinessDelta = meta.readinessDelta as { before?: number; after?: number } | undefined;
  const fallbackRan = progress.steps.some(
    (s) =>
      ["pre_intelligence", "pre_keyword_gap", "pre_plan"].includes(s.id) &&
      s.status === "done",
  );

  return {
    traceId: ctx.traceId,
    outcome: resolveEnhanceTraceOutcome(enhanceLogs, {
      aiSucceeded: meta.aiSucceeded === true,
      aiAttempted: meta.aiAttempted === true,
    }),
    wallClockMs,
    wallClockLabel: wallClockMs != null ? formatDurationMinSec(wallClockMs) : null,
    totalTokens,
    apiCallCount: enhanceLogs.length,
    modelsUsed,
    readinessBefore: readinessDelta?.before ?? null,
    readinessAfter: readinessDelta?.after ?? null,
    engineMode: typeof meta.engineMode === "string" ? meta.engineMode : null,
    aiAttempted: meta.aiAttempted === true,
    aiSucceeded: meta.aiSucceeded === true,
    warning: typeof meta.warning === "string" ? meta.warning : null,
    pathLabel: fallbackRan ? "Full fallback brief" : "Light path (fork/join)",
    jdIntel: {
      source: ctx.jdSource ?? "—",
      confidence: ctx.jdConfidence != null ? ctx.jdConfidence.toFixed(1) : "—",
      vocabSkills: ctx.vocabSkills,
      mustHaveSkills: ctx.jdMustHaveSkills,
    },
  };
}

function buildTimeline(
  progress: PipelineDebugProgress,
  steps: PipelineStepInsight[],
): PipelineRunView["timeline"] {
  const runStart = Date.parse(progress.startedAt);
  if (!Number.isFinite(runStart)) return [];

  return steps
    .filter((s) => s.durationMs != null && s.durationMs > 0)
    .map((s) => {
      const raw = progress.steps.find((row) => row.id === s.id);
      const stepStart = raw?.startedAt ? Date.parse(raw.startedAt) : runStart;
      return {
        stepId: s.id,
        label: s.label,
        status: s.status,
        startMs: Number.isFinite(stepStart) ? stepStart - runStart : 0,
        durationMs: s.durationMs!,
        parallel: PARALLEL_STEP_IDS.has(s.id),
      };
    })
    .sort((a, b) => a.startMs - b.startMs);
}

export function buildPipelineRunView(input: {
  progress: PipelineDebugProgress;
  context: PipelineRunContext;
  apiLogs: PipelineApiLogRow[];
}): PipelineRunView {
  const { progress, context, apiLogs } = input;
  const allInsights = progress.steps.map((step) =>
    buildStepInsight(step, context, apiLogs),
  );
  const insightById = new Map(allInsights.map((s) => [s.id, s]));

  const phases: PipelinePhaseView[] = [];
  for (const def of PHASE_DEFS) {
    const steps = def.stepIds
      .map((id) => insightById.get(id))
      .filter((s): s is PipelineStepInsight => Boolean(s));
    if (def.hideWhenAllSkipped && steps.every((s) => s.status === "skipped")) continue;
    const durationMs = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
    phases.push({
      id: def.id,
      label: def.label,
      hint: def.hint,
      steps,
      durationMs,
      status: phaseStatus(steps),
    });
  }

  const runStartMs = Date.parse(progress.startedAt);
  const traceLog = [...apiLogs].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  return {
    overview: buildOverview(progress, context, apiLogs),
    phases,
    traceLog,
    timeline: buildTimeline(progress, allInsights),
  };
}
