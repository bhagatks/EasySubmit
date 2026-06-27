"use client";

import type { JdCoverageReport } from "@/lib/job-tracker/enhance/enhance-brief";

type Props = {
  coverageAfter?: JdCoverageReport;
  readinessDelta?: { before: number; after: number };
  engineMode?: "ai" | "deterministic";
  warning?: string;
  enhanceSummary?: string;
};

export function EnhanceCoveragePanel({
  coverageAfter,
  readinessDelta,
  engineMode,
  warning,
  enhanceSummary,
}: Props) {
  const lowCoverage =
    coverageAfter != null && coverageAfter.coveragePercent < 85;
  const hasGaps = (coverageAfter?.gaps.length ?? 0) > 0;

  if (!coverageAfter && !warning && !enhanceSummary) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 text-sm">
      {warning ? (
        <p className="text-amber-200/90">{warning}</p>
      ) : null}
      {enhanceSummary ? (
        <p className="text-muted-foreground">{enhanceSummary}</p>
      ) : null}
      {coverageAfter ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              JD coverage: {coverageAfter.coveragePercent}%
            </span>
            {engineMode ? (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
                {engineMode}
              </span>
            ) : null}
            {readinessDelta ? (
              <span className="text-xs text-muted-foreground">
                Readiness {readinessDelta.before} → {readinessDelta.after}
              </span>
            ) : null}
          </div>
          {(lowCoverage || hasGaps) && coverageAfter.gaps.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-amber-200/80 mb-1">
                Gaps — add only if accurate for your experience:
              </p>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                {coverageAfter.gaps.slice(0, 8).map((g) => (
                  <li key={g.atom.id}>{g.atom.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
