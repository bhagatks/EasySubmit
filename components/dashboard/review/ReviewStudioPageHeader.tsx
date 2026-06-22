"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { getJobTrackerEntryById } from "@/app/actions/job-tracker";
import {
  DashboardHeaderActionsSlot,
  DashboardHeaderExpandSlot,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { WORKSPACE_TITLE_CLASS } from "@/components/dashboard/ReviewScreen";
import { StudioHeaderCenterSlot } from "@/components/resume/StudioHeaderCenter";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import {
  REVIEW_SCREEN_PANEL_LABELS,
  REVIEW_SCREEN_PANELS,
  jobTrackerReviewScreenUrl,
  type ReviewScreenPanel,
} from "@/lib/job-tracker/review-screen-ui";
import {
  jobTrackerStatusLabel,
  jobTrackerStatusStyle,
} from "@/lib/job-tracker/status-labels";
import { cn } from "@/lib/utils";

type ReviewStudioPageHeaderProps = {
  jobId: string;
};

function reviewJobMetaParts(entry: JobTrackerDetail) {
  const company = entry.company?.trim() || "Company unknown";
  const title = entry.title.trim() || "Role unknown";
  const location = entry.location?.trim() || null;
  const full = [company, title, location].filter(Boolean).join(" · ");
  return { company, title, location, full };
}

export function ReviewStudioPageHeader({ jobId }: ReviewStudioPageHeaderProps) {
  const [entry, setEntry] = useState<JobTrackerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getJobTrackerEntryById(jobId).then((result) => {
      if (cancelled) return;
      setEntry(result.success ? result.entry : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const jobMeta = entry ? reviewJobMetaParts(entry) : null;

  return (
    <header className="relative z-10 shrink-0 border-b border-white/10 px-3 pb-1.5 pt-2 text-left sm:px-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,20%)_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-5">
        <h1 className={cn(WORKSPACE_TITLE_CLASS, "shrink-0 text-xl sm:text-2xl")}>
          Review Screen
        </h1>

        <div aria-hidden="true" />

        {loading ? (
          <Loader2
            className="mx-auto h-3.5 w-3.5 animate-spin text-muted-foreground"
            aria-label="Loading job"
          />
        ) : jobMeta ? (
          <p
            className="min-w-0 truncate text-center text-[10px] leading-snug text-muted-foreground sm:text-[11px]"
            title={jobMeta.full}
          >
            <span className="font-medium text-foreground/90">{jobMeta.company}</span>
            <span className="text-muted-foreground/60"> · </span>
            <span className="text-foreground/80">{jobMeta.title}</span>
            {jobMeta.location ? (
              <>
                <span className="text-muted-foreground/60"> · </span>
                <span>{jobMeta.location}</span>
              </>
            ) : null}
          </p>
        ) : (
          <div aria-hidden="true" />
        )}

        <div aria-hidden="true" />

        <Link
          href={jobTrackerReviewScreenUrl(jobId, "resume")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/70 bg-surface/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground"
          aria-label="Back to Review Screen"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </Link>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div
          className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface/40 p-1"
          role="tablist"
          aria-label="Review Screen sections"
        >
          {REVIEW_SCREEN_PANELS.map((tab) => (
            <ReviewStudioTabLink key={tab} jobId={jobId} tab={tab} active={tab === "resume"} />
          ))}
        </div>

        <div className="min-w-0 flex-1" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-1.5">
          <StudioHeaderCenterSlot />
          <DashboardHeaderExpandSlot />
          <DashboardHeaderActionsSlot />
        </div>

        {entry ? (
          <span
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              jobTrackerStatusStyle(entry.status),
            )}
            title={jobTrackerStatusLabel(entry.status)}
          >
            {jobTrackerStatusLabel(entry.status)}
          </span>
        ) : null}
      </div>
    </header>
  );
}

function ReviewStudioTabLink({
  jobId,
  tab,
  active,
}: {
  jobId: string;
  tab: ReviewScreenPanel;
  active: boolean;
}) {
  return (
    <Link
      href={jobTrackerReviewScreenUrl(jobId, tab)}
      role="tab"
      aria-selected={active}
      className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {REVIEW_SCREEN_PANEL_LABELS[tab]}
    </Link>
  );
}
