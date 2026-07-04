"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PipelineRunDashboard } from "@/components/dashboard/dev/PipelineRunDashboard";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { PipelineStepFailure } from "@/lib/job-tracker/pipeline-tracker-view";
import {
  isPipelineDebugPollingIdle,
  pipelineDebugProgressSignature,
} from "@/lib/extension/pipeline-debug-display";
import type { PipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  formatApplyPipelineDevDetail,
  resolveApplyPipelineUserMessage,
  type ApplyPipelineUserMessageKind,
} from "@/src/shared/extension/apply-pipeline-user-messages";
import type { PipelineRunView } from "@/src/shared/extension/pipeline-run-view";
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
  const [insight, setInsight] = useState<PipelineRunView | null>(null);
  const [jobSummary, setJobSummary] = useState<PipelineDebugJobSummary | null>(null);
  const [stepFailure, setStepFailure] = useState<PipelineStepFailure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef(0);
  const progressSignatureRef = useRef("");
  const jobSummaryRef = useRef<PipelineDebugJobSummary | null>(null);
  const stepFailureRef = useRef<PipelineStepFailure | null>(null);
  const insightRef = useRef<PipelineRunView | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const captureScroll = useCallback(() => {
    const body = bodyRef.current;
    if (body) scrollTopRef.current = body.scrollTop;
  }, []);

  const handleBodyScroll = useCallback(() => {
    captureScroll();
  }, [captureScroll]);

  const userMessage = jobSummary
    ? resolveApplyPipelineUserMessage({
        status: jobSummary.status as JobTrackerStatus,
        progress,
        stepFailure,
        issueMessage: jobSummary.issueMessage,
        metadata: jobSummary.metadata,
      })
    : null;

  const devDetail = formatApplyPipelineDevDetail({
    stepFailure,
    issueMessage: jobSummary?.issueMessage,
  });

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
      insight?: PipelineRunView | null;
      job?: PipelineDebugJobSummary | null;
      stepFailure?: PipelineStepFailure | null;
      error?: string;
    };
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return {
      progress: data.progress ?? null,
      insight: data.insight ?? null,
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

        const insightJson = JSON.stringify(next.insight);
        if (insightJson !== JSON.stringify(insightRef.current)) {
          insightRef.current = next.insight;
          setInsight(next.insight);
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
    insightRef.current = null;
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
  }, [progress, insight, jobSummary, stepFailure]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [overflow-anchor:none] [scroll-behavior:auto] [touch-action:pan-y]"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 pb-8">
          <div className="rounded-xl border border-border bg-surface/60 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Job run
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

            {jobSummary && userMessage?.line ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold tracking-wide ${userMessageBadgeClass(userMessage.kind)}`}
                >
                  User sees: {userMessage.line}
                </span>
                {devDetail ? (
                  <span className="font-mono text-[10px] text-muted-foreground">Dev: {devDetail}</span>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
          </div>

          {!selectedEntryId ? (
            <p className="text-sm text-muted-foreground">Select a job to inspect its pipeline.</p>
          ) : !insight ? (
            <p className="text-sm text-muted-foreground">Waiting for pipeline progress…</p>
          ) : (
            <PipelineRunDashboard
              run={insight}
              jobTitle={jobSummary?.title ?? "Job"}
              company={jobs.find((j) => j.id === selectedEntryId)?.company ?? null}
              dbStatus={jobSummary?.status ?? "—"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
