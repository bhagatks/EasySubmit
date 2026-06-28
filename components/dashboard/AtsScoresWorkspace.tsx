"use client";

import { useState, useCallback } from "react";
import { Building2, ExternalLink, Loader2, ScanLine } from "lucide-react";
import { getJobTrackerEntryById } from "@/app/actions/job-tracker";
import { AtsPanel } from "@/components/dashboard/review/AtsPanel";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import type { JobTrackerDetail, JobTrackerSummary } from "@/lib/job-tracker/types";
import { cn } from "@/lib/utils";

type EntryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; detail: JobTrackerDetail }
  | { status: "error"; message: string };

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null;
  return (
    <span className="rounded-full border border-border/60 bg-surface/60 px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
      {platform}
    </span>
  );
}

function AtsEntryRow({ entry }: { entry: JobTrackerSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<EntryState>({ status: "idle" });

  const handleToggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);

    if (next && state.status === "idle") {
      setState({ status: "loading" });
      const result = await getJobTrackerEntryById(entry.id);
      if (result.success) {
        setState({ status: "loaded", detail: result.entry });
      } else {
        setState({ status: "error", message: result.error });
      }
    }
  }, [expanded, state.status, entry.id]);

  const scoreLabel = entry.hasTailoredResume ? null : (
    <span className="text-[10px] text-muted-foreground">No tailored resume yet</span>
  );

  return (
    <StudioCollapsibleSection
      variant="dashboard"
      title={
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
            {entry.company && (
              <p className="text-[11px] text-muted-foreground truncate">{entry.company}</p>
            )}
          </div>
        </div>
      }
      headerActions={
        <div className="flex items-center gap-1.5">
          {scoreLabel}
          <PlatformBadge platform={entry.platform} />
          {entry.canonicalUrl && (
            <a
              href={entry.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      }
      expanded={expanded}
      onToggle={handleToggle}
      showDragHandle={false}
    >
      <div className="border-t border-border/60">
        {state.status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ATS analysis…
          </div>
        )}
        {state.status === "error" && (
          <p className="px-5 py-6 text-sm text-red-400">{state.message}</p>
        )}
        {state.status === "loaded" && (
          <AtsPanel entry={state.detail} variant="inline" />
        )}
      </div>
    </StudioCollapsibleSection>
  );
}

type AtsScoresWorkspaceProps = {
  entries: JobTrackerSummary[];
};

export function AtsScoresWorkspace({ entries }: AtsScoresWorkspaceProps) {
  const withResume = entries.filter((e) => e.hasTailoredResume);
  const withoutResume = entries.filter((e) => !e.hasTailoredResume);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/60 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <ScanLine className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-4 font-display text-base font-semibold">No jobs tracked yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Save job postings with the extension to start tracking and scoring your resume against each role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {withResume.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {withResume.length} job{withResume.length !== 1 ? "s" : ""} with ATS score
          </p>
          <div className="space-y-2">
            {withResume.map((entry) => (
              <AtsEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {withoutResume.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {withoutResume.length} job{withoutResume.length !== 1 ? "s" : ""} without tailored resume
          </p>
          <div className={cn("space-y-2", withResume.length > 0 && "opacity-60")}>
            {withoutResume.map((entry) => (
              <AtsEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
