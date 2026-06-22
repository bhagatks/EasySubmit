"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Briefcase,
  ExternalLink,
  Loader2,
  Mail,
  Send,
  X,
} from "lucide-react";
import { getJobTrackerEntryById } from "@/app/actions/job-tracker";
import { Button } from "@/components/ui/button";
import { GlossyModal } from "@/components/ui/glossy-modal";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import {
  assessCaptureCompleteness,
  captureCompletenessLabel,
  formatScrapeConfidencePercent,
} from "@/lib/job-tracker/capture-completeness";
import {
  REVIEW_SCREEN_PANEL_LABELS,
  REVIEW_SCREEN_PANELS,
  type ReviewScreenPanel,
} from "@/lib/job-tracker/review-screen-ui";
import {
  jobTrackerStatusLabel,
  jobTrackerStatusStyle,
} from "@/lib/job-tracker/status-labels";
import { ReviewResumePanel } from "@/components/dashboard/ReviewResumePanel";
import { ReviewCoverPanel } from "@/components/dashboard/review/ReviewCoverPanel";
import { AtsPanel } from "@/components/dashboard/review/AtsPanel";
import { cn } from "@/lib/utils";

/** Matches `DashboardWorkspacePage` h1 — use for primary screen titles. */
export const WORKSPACE_TITLE_CLASS =
  "font-display text-2xl font-semibold tracking-tight text-foreground";

/** Fixed shell height — fills viewport with minimal outer margin. */
export const REVIEW_SCREEN_SHELL_CLASS =
  "h-[calc(100dvh-0.375rem)] min-h-0 max-h-[calc(100dvh-0.375rem)] w-[min(1060px,calc(100vw-0.375rem))]";

const TAB_PANEL_CLASS = "flex min-h-0 flex-1 flex-col";

type ReviewScreenProps = {
  jobId: string | null;
  panel: ReviewScreenPanel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPanelChange: (panel: ReviewScreenPanel) => void;
};

function reviewJobMetaParts(entry: JobTrackerDetail): {
  company: string;
  title: string;
  location: string | null;
  full: string;
} {
  const company = entry.company?.trim() || "Company unknown";
  const title = entry.title.trim() || "Role unknown";
  const location = entry.location?.trim() || null;
  const full = [company, title, location].filter(Boolean).join(" · ");
  return { company, title, location, full };
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PanelPlaceholder({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-surface/40 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function JobPanel({ entry }: { entry: JobTrackerDetail }) {
  const completeness = assessCaptureCompleteness({
    url: entry.canonicalUrl,
    title: entry.title,
    company: entry.company,
    location: entry.location,
    salaryText: entry.salaryText,
    description: entry.description,
    platform: entry.platform,
    metadata: entry.metadata,
  });

  const completenessTone =
    completeness.level === "complete"
      ? "border-mint/30 bg-mint/10 text-mint"
      : completeness.level === "partial"
        ? "border-primary/25 bg-primary/10 text-foreground"
        : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";

  return (
    <div className="space-y-5">
      <div className={cn("rounded-xl border px-4 py-3 text-sm", completenessTone)}>
        <p className="font-medium">{captureCompletenessLabel(completeness.level)}</p>
        {completeness.missingBlockingQuality.length > 0 ? (
          <p className="mt-1 text-xs opacity-90">
            Needs attention: {completeness.missingBlockingQuality.join(", ")} — job is saved; re-open
            the posting to capture again.
          </p>
        ) : null}
        {completeness.missingOptional.length > 0 ? (
          <p className="mt-1 text-xs opacity-75">
            Optional not captured: {completeness.missingOptional.join(", ")}
          </p>
        ) : null}
        {completeness.confidence != null ? (
          <p className="mt-1 text-xs opacity-90">
            Scrape confidence: {formatScrapeConfidencePercent(completeness.confidence)}%
          </p>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["Company", entry.company],
          ["Location", entry.location],
          ["Salary", entry.salaryText],
          ["Platform", entry.platform],
          ["Saved to tracker", formatDateTime(entry.savedAt)],
          ["Last updated", formatDateTime(entry.updatedAt)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/70 bg-surface/50 px-3 py-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm text-foreground">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-border/70 bg-surface/50 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Posting URL</p>
        <p className="mt-1 break-all text-sm">
          <Link
            href={entry.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {entry.canonicalUrl}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </p>
      </div>

      {entry.sourceProfileId ? (
        <div className="rounded-xl border border-border/70 bg-surface/50 px-3 py-2.5 text-sm text-muted-foreground">
          Resume Profile:{" "}
          <span className="font-medium text-foreground">
            &lsquo;{entry.sourceProfileName ?? "Unknown profile"}&rsquo;
          </span>
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-foreground">Job description</h3>
        {entry.description?.trim() ? (
          <div className="mt-2 max-h-[min(36vh,280px)] overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {entry.description.trim()}
            </pre>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No description captured yet. Open the posting in your browser and save again from the
            extension.
          </p>
        )}
      </div>
    </div>
  );
}

function CoverPanel({ entry, onRefresh }: { entry: JobTrackerDetail; onRefresh: () => void }) {
  return <ReviewCoverPanel entry={entry} onRefresh={onRefresh} />;
}

function ApplyPanel({ entry }: { entry: JobTrackerDetail }) {
  return (
    <div className="space-y-5">
      <PanelPlaceholder
        icon={Send}
        title="Apply on the job site"
        description="Use Apply on the tracker row to open the posting with the extension, or open it manually here."
        action={
          <Button variant="mint" className="rounded-xl" asChild>
            <Link href={entry.canonicalUrl} target="_blank" rel="noopener noreferrer">
              Open job posting
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    </div>
  );
}

export function ReviewScreen({
  jobId,
  panel,
  open,
  onOpenChange,
  onPanelChange,
}: ReviewScreenProps) {
  const [entry, setEntry] = useState<JobTrackerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntry = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await getJobTrackerEntryById(id);
    setLoading(false);
    if (!result.success) {
      setEntry(null);
      setError(result.error);
      return;
    }
    setEntry(result.entry);
  }, []);

  useEffect(() => {
    if (!open || !jobId) {
      setEntry(null);
      setError(null);
      return;
    }
    void loadEntry(jobId);
  }, [open, jobId, loadEntry]);

  const jobMeta = entry ? reviewJobMetaParts(entry) : null;

  return (
    <GlossyModal
      open={open}
      onOpenChange={onOpenChange}
      title="Review Screen"
      className={REVIEW_SCREEN_SHELL_CLASS}
      shellClassName="items-stretch justify-center px-0.5 py-0"
      bodyClassName={cn(
        "flex min-h-0 flex-1 basis-0 flex-col overflow-hidden",
        panel === "resume" || panel === "cover" ? "p-0" : "p-0",
      )}
      hideClose
      header={
        <header className="relative z-10 shrink-0 border-b border-white/10 px-3 pb-1.5 pt-2 text-left sm:px-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,20%)_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-5">
            <h2 id="glossy-modal-title" className={cn(WORKSPACE_TITLE_CLASS, "shrink-0 text-xl sm:text-2xl")}>
              Review Screen
            </h2>

            <div aria-hidden="true" />

            {jobMeta ? (
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

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/70 bg-surface/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground"
              aria-label="Close review screen"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Close
            </button>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface/40 p-1"
              role="tablist"
              aria-label="Review Screen sections"
            >
              {REVIEW_SCREEN_PANELS.map((tab) => (
                <button
                  key={tab}
                  id={`review-screen-tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={panel === tab}
                  aria-controls={`review-screen-panel-${tab}`}
                  onClick={() => onPanelChange(tab)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    panel === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {REVIEW_SCREEN_PANEL_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="min-w-0 flex-1" aria-hidden="true" />

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
      }
    >
      {loading ? (
        <div className={cn(TAB_PANEL_CLASS, "items-center justify-center text-muted-foreground")}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm">Loading Review Screen…</p>
        </div>
      ) : error ? (
        <div className={TAB_PANEL_CLASS}>
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        </div>
      ) : entry ? (
        <div
          key={panel}
          id={`review-screen-panel-${panel}`}
          role="tabpanel"
          aria-labelledby={`review-screen-tab-${panel}`}
          className={cn(
            TAB_PANEL_CLASS,
            panel === "resume" || panel === "cover"
              ? "h-full min-h-0 overflow-hidden"
              : "overflow-y-auto",
          )}
        >
          {panel === "job" ? <JobPanel entry={entry} /> : null}
          {panel === "resume" ? (
            <ReviewResumePanel entry={entry} onRefresh={() => jobId && void loadEntry(jobId)} />
          ) : null}
          {panel === "cover" ? (
            <CoverPanel entry={entry} onRefresh={() => jobId && void loadEntry(jobId)} />
          ) : null}
          {panel === "ats" ? <AtsPanel entry={entry} /> : null}
          {panel === "apply" ? <ApplyPanel entry={entry} /> : null}
        </div>
      ) : null}
    </GlossyModal>
  );
}
