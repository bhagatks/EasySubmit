"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  PipelineDebugArtifact,
  PipelineDebugArtifactKind,
} from "@/src/shared/extension/pipeline-debug-artifacts";
import type {
  PipelineDebugProgress,
  PipelineDebugStep,
  PipelineDebugStepStatus,
} from "@/src/shared/extension/pipeline-debug-types";
import {
  formatApplyPipelineDevDetail,
  resolveApplyPipelineUserMessage,
  type ApplyPipelineUserMessageKind,
} from "@/src/shared/extension/apply-pipeline-user-messages";

/** Fork/join architecture group order for the QA pipeline page. */
const PIPELINE_GROUP_ORDER = [
  "Capture",
  "Job track",
  "Resume track",
  "Gate",
  "Light merge",
  "Fallback",
  "AI gates",
  "Engine",
  "AI calls",
  "Persist",
  "Complete",
] as const;

const PARALLEL_GROUPS = new Set(["Job track", "Resume track"]);
const FALLBACK_GROUPS = new Set(["Fallback"]);

const ARCHITECTURE_LEGEND = [
  { label: "Capture", detail: "Scrape + save job → CAPTURED" },
  { label: "Job ∥ Resume", detail: "Start in parallel at capture" },
  { label: "Light merge", detail: "Skills only (mustHaveSkills)" },
  { label: "Resume AI", detail: "Summary + bullets from slim facts" },
  { label: "Fallback", detail: "Full brief only if resume AI fails" },
] as const;
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { PipelineStepFailure } from "@/lib/job-tracker/pipeline-tracker-view";
import { pipelineDebugProgressSignature, isPipelineDebugPollingIdle } from "@/lib/extension/pipeline-debug-display";
import { formatStepDurationLabel } from "@/src/shared/extension/pipeline-debug-duration";
import { scheduleRestoreBodyScroll } from "@/lib/extension/pipeline-debug-overlay-scroll";

const ACTIVE_POLL_MS = 800;
const IDLE_POLL_MS = 5000;

type PipelineDebugJobOption = {
  id: string;
  title: string;
  company: string | null;
  status: string;
  savedAt: string;
  hasFailure: boolean;
};

type PipelineDebugJobSummary = {
  status: string;
  title: string;
  issueMessage: string | null;
  metadata?: unknown;
};

function userMessageBadgeClass(kind: ApplyPipelineUserMessageKind): string {
  switch (kind) {
    case "error":
      return "bg-red-500/15 text-red-800 dark:text-red-200";
    case "warning":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    case "success":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "progress":
      return "bg-blue-500/15 text-blue-800 dark:text-blue-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const STEP_PALETTE = [
  {
    card: "border-sky-200 bg-sky-50",
    title: "text-sky-950",
    desc: "text-sky-700/80",
    detail: "text-sky-900",
    icon: "text-sky-600",
  },
  {
    card: "border-violet-200 bg-violet-50",
    title: "text-violet-950",
    desc: "text-violet-700/80",
    detail: "text-violet-900",
    icon: "text-violet-600",
  },
  {
    card: "border-amber-200 bg-amber-50",
    title: "text-amber-950",
    desc: "text-amber-800/80",
    detail: "text-amber-900",
    icon: "text-amber-700",
  },
  {
    card: "border-teal-200 bg-teal-50",
    title: "text-teal-950",
    desc: "text-teal-700/80",
    detail: "text-teal-900",
    icon: "text-teal-600",
  },
  {
    card: "border-rose-200 bg-rose-50",
    title: "text-rose-950",
    desc: "text-rose-700/80",
    detail: "text-rose-900",
    icon: "text-rose-600",
  },
  {
    card: "border-indigo-200 bg-indigo-50",
    title: "text-indigo-950",
    desc: "text-indigo-700/80",
    detail: "text-indigo-900",
    icon: "text-indigo-600",
  },
] as const;

const ARTIFACT_PALETTE: Record<
  PipelineDebugArtifactKind,
  { shell: string; header: string; body: string }
> = {
  data: {
    shell: "border-slate-200 bg-slate-50",
    header: "text-slate-700",
    body: "text-slate-800",
  },
  input: {
    shell: "border-blue-200 bg-blue-50",
    header: "text-blue-800",
    body: "text-blue-950",
  },
  output: {
    shell: "border-emerald-200 bg-emerald-50",
    header: "text-emerald-800",
    body: "text-emerald-950",
  },
  ai_request: {
    shell: "border-orange-200 bg-orange-50",
    header: "text-orange-800",
    body: "text-orange-950",
  },
  ai_response: {
    shell: "border-fuchsia-200 bg-fuchsia-50",
    header: "text-fuchsia-800",
    body: "text-fuchsia-950",
  },
  external_request: {
    shell: "border-violet-200 bg-violet-50",
    header: "text-violet-800",
    body: "text-violet-950",
  },
  external_response: {
    shell: "border-teal-200 bg-teal-50",
    header: "text-teal-800",
    body: "text-teal-950",
  },
  flags: {
    shell: "border-cyan-200 bg-cyan-50",
    header: "text-cyan-800",
    body: "text-cyan-950",
  },
};

function stepPaletteIndex(stepId: string): number {
  let hash = 0;
  for (let i = 0; i < stepId.length; i += 1) {
    hash = (hash + stepId.charCodeAt(i) * (i + 1)) % STEP_PALETTE.length;
  }
  return hash;
}

function statusStyles(status: PipelineDebugStepStatus) {
  switch (status) {
    case "done":
      return {
        card: "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200/80",
        title: "text-emerald-950",
        desc: "text-emerald-800/85",
        detail: "text-emerald-900",
        icon: "text-emerald-600",
        badge: "bg-emerald-600 text-white",
        badgeLabel: "Completed",
      };
    case "active":
      return {
        card: "border-blue-300 bg-blue-50 ring-2 ring-blue-200",
        title: "text-blue-950",
        desc: "text-blue-800/85",
        detail: "text-blue-900",
        icon: "text-blue-600 animate-pulse",
        badge: "bg-blue-600 text-white",
        badgeLabel: "Running",
      };
    case "error":
      return {
        card: "border-red-300 bg-red-50 ring-1 ring-red-200",
        title: "text-red-950",
        desc: "text-red-800/85",
        detail: "text-red-900",
        icon: "text-red-600",
        badge: "bg-red-600 text-white",
        badgeLabel: "Error",
      };
    case "skipped":
      return {
        card: "border-slate-200 bg-slate-50",
        title: "text-slate-700",
        desc: "text-slate-500",
        detail: "text-slate-600",
        icon: "text-slate-400",
        badge: "bg-slate-400 text-white",
        badgeLabel: "Skipped",
      };
    case "warning":
      return {
        card: "border-amber-300 bg-amber-50 ring-1 ring-amber-200/80",
        title: "text-amber-950",
        desc: "text-amber-800/85",
        detail: "text-amber-900",
        icon: "text-amber-600",
        badge: "bg-amber-600 text-white",
        badgeLabel: "Degraded",
      };
    default:
      return {
        card: "border-slate-200 bg-white",
        title: "text-slate-800",
        desc: "text-slate-500",
        detail: "text-slate-600",
        icon: "text-slate-300",
        badge: "bg-slate-200 text-slate-600",
        badgeLabel: "Pending",
      };
  }
}

function statusIcon(status: PipelineDebugStepStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "active":
      return "◉";
    case "error":
      return "✕";
    case "skipped":
      return "–";
    case "warning":
      return "!";
    default:
      return "○";
  }
}

function kindLabel(kind: PipelineDebugArtifactKind): string {
  switch (kind) {
    case "ai_request":
      return "AI request";
    case "ai_response":
      return "AI response";
    case "external_request":
      return "External request";
    case "external_response":
      return "External response";
    case "flags":
      return "Flags";
    case "input":
      return "Input";
    case "output":
      return "Output";
    default:
      return "Data";
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ArtifactBlock({ artifact }: { artifact: PipelineDebugArtifact }) {
  const [open, setOpen] = useState(false);
  const palette = ARTIFACT_PALETTE[artifact.kind];

  return (
    <div className={`rounded-lg border ${palette.shell}`}>
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide ${palette.header}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {kindLabel(artifact.kind)} · {artifact.label}
        </span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <pre
          className={`max-h-64 overflow-auto border-t border-black/5 px-3 py-2 text-[10px] leading-relaxed ${palette.body}`}
        >
          {formatJson(artifact.payload)}
        </pre>
      ) : null}
    </div>
  );
}

const StepRow = memo(
  function StepRow({
    step,
    index,
  }: {
    step: PipelineDebugStep;
    index: number;
  }) {
  const [open, setOpen] = useState(step.status === "active" || step.status === "error");
  const hasArtifacts = Boolean(step.artifacts?.length);
  const durationLabel = formatStepDurationLabel(step);
  const status = statusStyles(step.status);
  const palette =
    step.status === "pending" || step.status === "skipped"
      ? STEP_PALETTE[(index + stepPaletteIndex(step.id)) % STEP_PALETTE.length]
      : null;

  const cardClass = palette && step.status === "pending" ? palette.card : status.card;

  const titleClass = palette && step.status === "pending" ? palette.title : status.title;
  const descClass = palette && step.status === "pending" ? palette.desc : status.desc;
  const detailClass = palette && step.status === "pending" ? palette.detail : status.detail;
  const iconClass = palette && step.status === "pending" ? palette.icon : status.icon;

  return (
    <div className={`rounded-xl border px-3 py-2.5 shadow-sm ${cardClass}`}>
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`mt-0.5 w-4 shrink-0 text-sm font-bold ${iconClass}`}>
          {statusIcon(step.status)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`block text-sm font-semibold ${titleClass}`}>{step.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.badge}`}
            >
              {status.badgeLabel}
            </span>
            {durationLabel ? (
              <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                {durationLabel}
              </span>
            ) : null}
          </span>
          <span className={`block text-[11px] ${descClass}`}>{step.description}</span>
          {step.detail ? (
            <span className={`mt-1 block text-xs font-medium ${detailClass}`}>{step.detail}</span>
          ) : null}
        </span>
        {hasArtifacts ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {open ? "Hide" : "Results"}
          </span>
        ) : null}
      </button>
      {open && hasArtifacts ? (
        <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
          {step.artifacts!.map((artifact) => (
            <ArtifactBlock key={artifact.label} artifact={artifact} />
          ))}
        </div>
      ) : null}
    </div>
  );
  },
  (prev, next) =>
    prev.index === next.index &&
    prev.step.id === next.step.id &&
    prev.step.status === next.step.status &&
    prev.step.detail === next.step.detail &&
    prev.step.label === next.step.label &&
    prev.step.startedAt === next.step.startedAt &&
    prev.step.finishedAt === next.step.finishedAt &&
    (prev.step.artifacts?.length ?? 0) === (next.step.artifacts?.length ?? 0),
);

function formatJobOptionLabel(job: PipelineDebugJobOption): string {
  const company = job.company?.trim() || "Company unknown";
  const flag = job.hasFailure ? " · failed" : "";
  return `${job.title} · ${company} (${job.status})${flag}`;
}

type PipelineDebugWorkspaceProps = {
  initialEntryId?: string | null;
};

export function PipelineDebugWorkspace({ initialEntryId = "" }: PipelineDebugWorkspaceProps) {
  const [jobs, setJobs] = useState<PipelineDebugJobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState(initialEntryId?.trim() ?? "");
  const [progress, setProgress] = useState<PipelineDebugProgress | null>(null);
  const [jobSummary, setJobSummary] = useState<PipelineDebugJobSummary | null>(null);
  const [stepFailure, setStepFailure] = useState<PipelineStepFailure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef(0);
  const progressSignatureRef = useRef("");
  const jobSummaryRef = useRef<PipelineDebugJobSummary | null>(null);
  const stepFailureRef = useRef<PipelineStepFailure | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const captureScroll = useCallback(() => {
    const body = bodyRef.current;
    if (body) scrollTopRef.current = body.scrollTop;
  }, []);

  const handleBodyScroll = useCallback(() => {
    captureScroll();
  }, [captureScroll]);

  const groupedSteps = useMemo(() => {
    if (!progress?.steps) return [];
    const groups = new Map<string, PipelineDebugStep[]>();
    for (const name of PIPELINE_GROUP_ORDER) {
      groups.set(name, []);
    }
    for (const step of progress.steps) {
      const groupName = step.group || "Other";
      const list = groups.get(groupName) ?? [];
      list.push(step);
      groups.set(groupName, list);
    }
    const knownGroups = new Set<string>(PIPELINE_GROUP_ORDER);
    const ordered: Array<[string, PipelineDebugStep[]]> = [];
    for (const name of PIPELINE_GROUP_ORDER) {
      const steps = groups.get(name);
      if (steps && steps.length > 0) ordered.push([name, steps]);
    }
    for (const [name, steps] of groups) {
      if (!knownGroups.has(name) && steps.length > 0) {
        ordered.push([name, steps]);
      }
    }
    return ordered;
  }, [progress]);

  const groupSummary = useMemo(() => {
    return groupedSteps.map(([group, steps]) => {
      const done = steps.filter((s) => s.status === "done").length;
      const active = steps.some((s) => s.status === "active");
      const error = steps.some((s) => s.status === "error");
      const warning = steps.some((s) => s.status === "warning");
      const skipped = steps.filter((s) => s.status === "skipped").length;
      return { group, done, total: steps.length, active, error, warning, skipped };
    });
  }, [groupedSteps]);

  const userMessage = useMemo(() => {
    if (!jobSummary) return null;
    return resolveApplyPipelineUserMessage({
      status: jobSummary.status as JobTrackerStatus,
      progress,
      stepFailure,
      issueMessage: jobSummary.issueMessage,
      metadata: jobSummary.metadata,
    });
  }, [jobSummary, progress, stepFailure]);

  const devDetail = useMemo(
    () =>
      formatApplyPipelineDevDetail({
        stepFailure,
        issueMessage: jobSummary?.issueMessage,
      }),
    [jobSummary?.issueMessage, stepFailure],
  );

  useEffect(() => {
    let cancelled = false;
    const preferredId = initialEntryId?.trim() ?? "";
    void (async () => {
      setJobsLoading(true);
      try {
        const res = await fetch("/api/dashboard/pipeline-debug/jobs", { cache: "no-store" });
        const data = (await res.json()) as {
          success: boolean;
          jobs?: PipelineDebugJobOption[];
          error?: string;
        };
        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Could not load jobs");
        }
        if (cancelled) return;
        const list = data.jobs ?? [];
        setJobs(list);
        if (list.length === 0) return;

        const preferredExists = preferredId && list.some((job) => job.id === preferredId);
        setSelectedEntryId((current) => {
          if (current && list.some((job) => job.id === current)) return current;
          if (preferredExists) return preferredId;
          return list[0]!.id;
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load jobs");
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialEntryId]);

  const fetchProgress = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/jobs/${encodeURIComponent(id)}/pipeline-debug`, {
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success: boolean;
      progress?: PipelineDebugProgress | null;
      job?: PipelineDebugJobSummary | null;
      stepFailure?: PipelineStepFailure | null;
      error?: string;
    };
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return {
      progress: data.progress ?? null,
      job: data.job ?? null,
      stepFailure: data.stepFailure ?? null,
    };
  }, []);

  useEffect(() => {
    if (!selectedEntryId) return undefined;
    let cancelled = false;

    const scheduleNextPoll = (delayMs: number) => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = window.setTimeout(() => void poll(), delayMs);
    };

    const poll = async () => {
      try {
        captureScroll();
        const next = await fetchProgress(selectedEntryId);
        if (cancelled) return;

        let layoutChanged = false;

        const signature = pipelineDebugProgressSignature(next.progress);
        if (signature !== progressSignatureRef.current) {
          progressSignatureRef.current = signature;
          setProgress(next.progress);
          layoutChanged = true;
        }

        const jobJson = JSON.stringify(next.job);
        if (jobJson !== JSON.stringify(jobSummaryRef.current)) {
          jobSummaryRef.current = next.job;
          setJobSummary(next.job);
          layoutChanged = true;
        }

        const failureJson = JSON.stringify(next.stepFailure);
        if (failureJson !== JSON.stringify(stepFailureRef.current)) {
          stepFailureRef.current = next.stepFailure;
          setStepFailure(next.stepFailure);
          layoutChanged = true;
        }

        if (layoutChanged) {
          requestAnimationFrame(() => {
            const body = bodyRef.current;
            if (body) scheduleRestoreBodyScroll(body, scrollTopRef.current);
          });
        }

        setError(null);
        scheduleNextPoll(
          isPipelineDebugPollingIdle(next.progress) ? IDLE_POLL_MS : ACTIVE_POLL_MS,
        );
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : "Failed to load progress");
        scheduleNextPoll(ACTIVE_POLL_MS);
      }
    };

    progressSignatureRef.current = "";
    void poll();
    return () => {
      cancelled = true;
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [captureScroll, fetchProgress, selectedEntryId]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    scheduleRestoreBodyScroll(body, scrollTopRef.current);
  }, [progress, jobSummary, stepFailure]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [overflow-anchor:none] [scroll-behavior:auto] [touch-action:pan-y]"
      >
        <div className="flex flex-col gap-3 pb-1">
          <div className="rounded-xl border border-border bg-surface/60 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Job
              </span>
              <select
                value={selectedEntryId}
                disabled={jobsLoading || jobs.length === 0}
                onChange={(event) => setSelectedEntryId(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              >
                {jobs.length === 0 ? (
                  <option value="">{jobsLoading ? "Loading jobs…" : "No Apply runs yet"}</option>
                ) : (
                  jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {formatJobOptionLabel(job)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface/60 shadow-sm">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Apply pipeline (QA)
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Fork/join: capture starts job track and resume track in parallel → light skills merge →
                resume AI. Fallback steps run only when resume AI fails.
              </p>
              <p className="mt-1 break-all text-[11px] text-muted-foreground">
                trace: {progress?.traceId ?? (selectedEntryId || "—")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ARCHITECTURE_LEGEND.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-lg border border-border/80 bg-background/80 px-2 py-1 text-[10px] leading-snug text-muted-foreground"
                    title={item.detail}
                  >
                    <span className="font-semibold text-foreground">{item.label}</span>
                    <span className="mx-1 text-border">·</span>
                    {item.detail}
                  </span>
                ))}
              </div>
              {jobSummary ? (
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
                      DB: {jobSummary.status}
                    </span>
                    {userMessage?.line ? (
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold tracking-wide ${userMessageBadgeClass(userMessage.kind)}`}
                      >
                        User: {userMessage.line}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        User: —
                      </span>
                    )}
                  </div>
                  {groupSummary.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {groupSummary.map((row) => (
                        <span
                          key={row.group}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                            row.error
                              ? "bg-red-500/15 text-red-800 dark:text-red-200"
                              : row.active
                                ? "bg-blue-500/15 text-blue-800 dark:text-blue-200"
                                : row.warning
                                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                                  : row.skipped === row.total
                                    ? "bg-slate-500/10 text-slate-600"
                                    : row.done === row.total
                                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                                      : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.group}
                          {PARALLEL_GROUPS.has(row.group) ? " ∥" : ""}{" "}
                          {row.done}/{row.total}
                          {row.skipped > 0 ? ` · ${row.skipped} skip` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {devDetail ? (
                    <p className="break-words font-mono text-[10px] leading-relaxed text-muted-foreground">
                      Dev: {devDetail}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
            </div>
            <div className="bg-background px-4 py-3">
              {!selectedEntryId ? (
                <p className="text-sm text-muted-foreground">Select a job to inspect its pipeline.</p>
              ) : groupedSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Waiting for pipeline progress…</p>
              ) : (
                <div className="space-y-4">
                  {groupedSteps.map(([group, steps]) => {
                    const isParallel = PARALLEL_GROUPS.has(group);
                    const isFallback = FALLBACK_GROUPS.has(group);
                    const allSkipped = steps.every((s) => s.status === "skipped");
                    return (
                      <section
                        key={group}
                        className={
                          isFallback && allSkipped
                            ? "opacity-70"
                            : isParallel
                              ? "rounded-xl border border-primary/20 bg-primary/5 p-3"
                              : undefined
                        }
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            {group}
                          </h3>
                          {isParallel ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Parallel at capture
                            </span>
                          ) : null}
                          {isFallback ? (
                            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Happy path: skipped
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {steps.map((step, index) => (
                            <StepRow key={step.id} step={step} index={index} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
