"use client";

import { useMemo, useState } from "react";
import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";
import { formatDurationMinSec } from "@/src/shared/extension/pipeline-debug-duration";
import type { PipelineDebugStepStatus } from "@/src/shared/extension/pipeline-debug-types";
import {
  summarizeApiExchange,
  type PipelineApiExchange,
} from "@/src/shared/extension/pipeline-debug-step-view";
import type {
  PipelinePhaseView,
  PipelineRunView,
  PipelineStepInsight,
} from "@/src/shared/extension/pipeline-run-view";

function statusDot(status: PipelineDebugStepStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500";
    case "active":
      return "bg-blue-500 animate-pulse";
    case "error":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    case "skipped":
      return "bg-slate-300";
    default:
      return "bg-slate-200";
  }
}

function statusText(status: PipelineDebugStepStatus): string {
  switch (status) {
    case "done":
      return "text-emerald-700";
    case "active":
      return "text-blue-700";
    case "error":
      return "text-red-700";
    case "warning":
      return "text-amber-700";
    case "skipped":
      return "text-slate-500";
    default:
      return "text-slate-400";
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-white tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

function JdIntelMetricCard({
  intel,
}: {
  intel: PipelineRunView["overview"]["jdIntel"];
}) {
  const rows = [
    { label: "Source", value: intel.source },
    { label: "Conf", value: intel.confidence },
    { label: "Vocab", value: String(intel.vocabSkills) },
    { label: "Must-have", value: String(intel.mustHaveSkills) },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        JD intel
      </p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="truncate text-xs font-semibold tabular-nums text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function WaterfallBar({
  run,
}: {
  run: PipelineRunView;
}) {
  const maxEnd = useMemo(() => {
    return Math.max(
      ...run.timeline.map((t) => t.startMs + t.durationMs),
      run.overview.wallClockMs ?? 1,
      1,
    );
  }, [run]);

  if (run.timeline.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Timeline
      </p>
      <div className="space-y-1.5">
        {run.timeline.map((row) => {
          const left = (row.startMs / maxEnd) * 100;
          const width = Math.max((row.durationMs / maxEnd) * 100, 0.8);
          return (
            <div key={row.stepId} className="flex items-center gap-2 text-[11px]">
              <span className="w-36 shrink-0 truncate text-muted-foreground" title={row.label}>
                {row.parallel ? "∥ " : ""}
                {row.label}
              </span>
              <div className="relative h-5 flex-1 rounded-md bg-muted/40">
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded ${statusDot(row.status)} opacity-80`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${formatDurationMinSec(row.durationMs)}`}
                />
              </div>
              <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
                {formatDurationMinSec(row.durationMs)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApiExchangePanel({ exchange }: { exchange: PipelineApiExchange }) {
  const [open, setOpen] = useState(false);
  const summary = summarizeApiExchange(exchange);

  return (
    <div className="rounded-lg border border-orange-200/80 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-800 dark:text-orange-300">
            API · {exchange.label}
          </p>
          {summary ? (
            <p className="truncate text-[11px] text-orange-900/80 dark:text-orange-200/80">{summary}</p>
          ) : null}
        </div>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-orange-200/60 px-3 py-2 md:grid-cols-2 dark:border-orange-900/40">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-orange-700">Request</p>
            <pre className="max-h-48 overflow-auto rounded-md bg-background/80 p-2 text-[10px]">
              {exchange.request ? formatJson(exchange.request.payload) : "—"}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-fuchsia-700">Response</p>
            <pre className="max-h-48 overflow-auto rounded-md bg-background/80 p-2 text-[10px]">
              {exchange.response ? formatJson(exchange.response.payload) : "—"}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactPanel({ artifact }: { artifact: PipelineDebugArtifact }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        className="flex w-full justify-between px-3 py-2 text-left text-[11px] font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{artifact.label}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <pre className="max-h-40 overflow-auto border-t border-border px-3 py-2 text-[10px]">
          {formatJson(artifact.payload)}
        </pre>
      ) : null}
    </div>
  );
}

function StepCard({ step }: { step: PipelineStepInsight }) {
  const [open, setOpen] = useState(
    step.status === "error" || step.status === "active" || step.linkedLogs.length > 0,
  );
  const hasDetail =
    step.decisions.length > 0 ||
    step.changes.length > 0 ||
    step.apiExchanges.length > 0 ||
    step.linkedLogs.length > 0 ||
    step.artifacts.length > 0 ||
    step.meta.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card/50 shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => hasDetail && setOpen((v) => !v)}
      >
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(step.status)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${statusText(step.status)}`}>{step.headline}</span>
            {step.durationLabel ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {step.durationLabel}
              </span>
            ) : null}
            {step.linkedLogs.length > 0 ? (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:text-orange-200">
                {step.linkedLogs.length} log{step.linkedLogs.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{step.id}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{step.story}</p>
        </div>
        {hasDetail ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
            {open ? "Hide" : "Expand"}
          </span>
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {step.decisions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {step.decisions.map((d) => (
                <span
                  key={`${d.label}-${d.value}`}
                  className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[10px]"
                >
                  <span className="font-semibold text-muted-foreground">{d.label}</span>
                  <span className="mx-1 text-border">=</span>
                  <span className="font-mono text-foreground">{d.value}</span>
                </span>
              ))}
            </div>
          ) : null}

          {step.changes.length > 0 ? (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                What changed
              </p>
              <ul className="list-inside list-disc text-sm text-foreground">
                {step.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {step.apiExchanges.map((ex) => (
            <ApiExchangePanel key={ex.label} exchange={ex} />
          ))}

          {step.artifacts.map((a) => (
            <ArtifactPanel key={a.label} artifact={a} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PhaseSection({ phase }: { phase: PipelinePhaseView }) {
  const [open, setOpen] = useState(phase.status !== "skipped");
  const doneCount = phase.steps.filter((s) => s.status === "done").length;

  return (
    <section className="rounded-xl border border-border bg-surface/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusDot(phase.status)}`} />
            <h3 className="font-display text-sm font-semibold text-foreground">{phase.label}</h3>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {doneCount}/{phase.steps.length}
            </span>
            {phase.durationMs > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {formatDurationMinSec(phase.durationMs)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{phase.hint}</p>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-3">
          {phase.steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TraceLogTable({ run }: { run: PipelineRunView }) {
  if (run.traceLog.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No api_call_logs rows for this trace — AI may be off or logs not persisted.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-[11px]">
        <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Time</th>
            <th className="px-3 py-2 font-semibold">Operation</th>
            <th className="px-3 py-2 font-semibold">Model</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Duration</th>
            <th className="px-3 py-2 font-semibold">Tokens</th>
            <th className="px-3 py-2 font-semibold">Trace</th>
          </tr>
        </thead>
        <tbody>
          {run.traceLog.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {new Date(row.createdAt).toISOString().slice(11, 23)}
              </td>
              <td className="px-3 py-2 font-mono">{row.operation}</td>
              <td className="px-3 py-2">{row.modelId ?? "—"}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    row.status === "success"
                      ? "text-emerald-600"
                      : row.status === "error"
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }
                >
                  {row.status}
                </span>
                {row.errorCode ? (
                  <span className="ml-1 text-red-500">({row.errorCode})</span>
                ) : null}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatDurationMinSec(row.durationMs)}</td>
              <td className="px-3 py-2 tabular-nums">{row.tokensUsed ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{row.traceId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type PipelineRunDashboardProps = {
  run: PipelineRunView;
  jobTitle: string;
  company: string | null;
  dbStatus: string;
};

export function PipelineRunDashboard({
  run,
  jobTitle,
  company,
  dbStatus,
}: PipelineRunDashboardProps) {
  const { overview } = run;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-[oklch(0.16_0.04_268)] p-4 text-white shadow-lg md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Pipeline run
            </p>
            <h2 className="font-display text-xl font-semibold">{jobTitle}</h2>
            <p className="text-sm text-slate-300">
              {company ?? "—"} · DB {dbStatus} · {overview.pathLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-300">
            trace {overview.traceId ?? "—"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Outcome" value={overview.outcome} />
          <MetricCard
            label="Wall clock"
            value={overview.wallClockLabel ?? "—"}
          />
          <MetricCard
            label="Readiness"
            value={
              overview.readinessBefore != null && overview.readinessAfter != null
                ? `${overview.readinessBefore} → ${overview.readinessAfter}`
                : "—"
            }
          />
          <MetricCard
            label="API calls"
            value={String(overview.apiCallCount)}
            sub={overview.modelsUsed.join(", ") || undefined}
          />
          <MetricCard label="Tokens" value={overview.totalTokens.toLocaleString()} />
          <JdIntelMetricCard intel={overview.jdIntel} />
        </div>

        {overview.warning ? (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {overview.warning}
          </p>
        ) : null}
      </div>

      <WaterfallBar run={run} />

      <div className="space-y-3">
        {run.phases.map((phase) => (
          <PhaseSection key={phase.id} phase={phase} />
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface/40 p-4">
        <h3 className="mb-1 font-display text-sm font-semibold text-foreground">
          Trace log (api_call_logs)
        </h3>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Chronological DB telemetry — correlate with steps above by operation and trace id.
        </p>
        <TraceLogTable run={run} />
      </section>
    </div>
  );
}
