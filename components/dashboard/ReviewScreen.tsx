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
import { cn } from "@/lib/utils";

/** Matches `DashboardWorkspacePage` h1 — use for primary screen titles. */
export const WORKSPACE_TITLE_CLASS =
  "font-display text-2xl font-semibold tracking-tight text-foreground";

/** Fixed shell height — tab bodies scroll inside without resizing the Review Screen. */
export const REVIEW_SCREEN_SHELL_CLASS =
  "h-[min(85dvh,840px)] min-h-[min(85dvh,840px)] max-h-[min(85dvh,840px)] w-[min(960px,calc(100vw-1.5rem))]";

const TAB_PANEL_CLASS = "flex min-h-[min(calc(85dvh-11.5rem),660px)] flex-col";

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

function CoverPanel({ entry }: { entry: JobTrackerDetail }) {
  const coverLetter =
    typeof entry.metadata?.coverLetter === "string" ? entry.metadata.coverLetter : null;

  if (coverLetter?.trim()) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cover letter for this job (stored on the job record).
        </p>
        <div className="max-h-[min(50vh,400px)] overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {coverLetter.trim()}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <PanelPlaceholder
      icon={Mail}
      title="Cover letter coming soon"
      description="Cover letters will be generated during tailoring and stored on this job."
    />
  );
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
      bodyClassName="flex min-h-0 flex-1 basis-0 flex-col px-6 py-5"
      hideClose
      header={
        <header className="relative z-10 shrink-0 border-b border-white/10 px-6 pb-3 pt-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="glossy-modal-title" className={WORKSPACE_TITLE_CLASS}>
                Review Screen
              </h2>
              {jobMeta ? (
                <p
                  className="mt-1.5 min-w-0 truncate text-sm leading-snug"
                  title={jobMeta.full}
                >
                  <span className="font-medium text-foreground">{jobMeta.company}</span>
                  <span className="text-muted-foreground/70"> · </span>
                  <span className="text-foreground">{jobMeta.title}</span>
                  {jobMeta.location ? (
                    <>
                      <span className="text-muted-foreground/70"> · </span>
                      <span className="text-muted-foreground">{jobMeta.location}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
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

          <div className="mt-2.5 flex items-center gap-2">
            <div
              className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface/40 p-1"
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

            {entry ? (
              <div className="flex shrink-0 items-center gap-1.5 pl-1">
                <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                  Status
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    jobTrackerStatusStyle(entry.status),
                  )}
                  title={`Status: ${jobTrackerStatusLabel(entry.status)}`}
                >
                  {jobTrackerStatusLabel(entry.status)}
                </span>
              </div>
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
          className={TAB_PANEL_CLASS}
        >
          {panel === "job" ? <JobPanel entry={entry} /> : null}
          {panel === "resume" ? <ReviewResumePanel entry={entry} /> : null}
          {panel === "cover" ? <CoverPanel entry={entry} /> : null}
          {panel === "apply" ? <ApplyPanel entry={entry} /> : null}
        </div>
      ) : null}
    </GlossyModal>
  );
}
