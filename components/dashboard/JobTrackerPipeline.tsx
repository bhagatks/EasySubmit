"use client";

import Link from "next/link";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ChevronRight,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  archiveJobTrackerEntry,
  deleteJobTrackerEntry,
  markJobTrackerEntryApplied,
  tailorJobTrackerEntry,
  unarchiveJobTrackerEntry,
} from "@/app/actions/job-tracker";
import { PipelineBar } from "@/components/dashboard/PipelineBar";
import { ExtensionInstallCta } from "@/components/dashboard/ExtensionInstallCta";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BRAND_FULL } from "@/lib/brand";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import {
  JOB_RESUME_STUDIO_LABEL,
  JOB_RESUME_STUDIO_LINK_TITLE,
} from "@/lib/job-tracker/review-screen-ui";
import { resolveDashboardTrackerRowChrome } from "@/lib/job-tracker/tracker-row-chrome";
import { resolveTrackerPipelineView } from "@/lib/job-tracker/pipeline-tracker-view";
import { resolveJourneyDisplay, type JourneyDisplay } from "@/src/shared/journey-display";
import {
  notifyExtensionJobArchived,
  startJobApplyFromDashboard,
} from "@/lib/extension/start-job-apply-from-dashboard";
import { useDashboardExtensionConnected } from "@/lib/hooks/useDashboardExtensionConnected";
import { shouldShowExtensionInstallCta } from "@/lib/extension/extension-install-cta";
import { cn } from "@/lib/utils";
import { serverActionClientErrorMessage } from "@/lib/server-action-client";

type JobTrackerPipelineProps = {
  entries: JobTrackerSummary[];
  archivedView?: boolean;
  onReview: (entryId: string) => void;
  onMutated?: () => void;
  selectedEntryIds?: string[];
  onSelectedEntryIdsChange?: (ids: string[]) => void;
};

function stopRowAction(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

function trackerRowLine(entry: JobTrackerSummary): string {
  const role = entry.title.trim() || "Role unknown";
  const company = entry.company?.trim() || "Company unknown";
  return `${role} · ${company}`;
}

function TrackerIssueIcon({
  message,
  severity,
}: {
  message: string | null | undefined;
  severity: "error" | "warning" | null;
}) {
  if (!message?.trim() || !severity) return null;

  const className =
    severity === "error"
      ? "text-destructive hover:bg-destructive/10"
      : "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400";

  return (
    <span
      className={cn("rounded-lg p-1 transition-colors", className)}
      title={message.trim()}
      aria-label={message.trim()}
      role="img"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function rowLinkActionClass(): string {
  return "inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50";
}

export function JobTrackerPipeline({
  entries,
  archivedView = false,
  onReview,
  onMutated,
  selectedEntryIds = [],
  onSelectedEntryIdsChange,
}: JobTrackerPipelineProps) {
  const [deleteTarget, setDeleteTarget] = useState<JobTrackerSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<JobTrackerSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extensionHint, setExtensionHint] = useState<string | null>(null);
  const extensionConnected = useDashboardExtensionConnected();
  const extensionInstalled = extensionConnected === true;
  const selectedIdSet = new Set(selectedEntryIds);

  function toggleEntrySelected(entryId: string) {
    if (!onSelectedEntryIdsChange) return;
    const next = new Set(selectedIdSet);
    if (next.has(entryId)) {
      next.delete(entryId);
    } else {
      next.add(entryId);
    }
    onSelectedEntryIdsChange([...next]);
  }

  useEffect(() => {
    if (extensionConnected !== true) return;
    setExtensionHint((current) =>
      current?.includes("Install the") ? null : current,
    );
  }, [extensionConnected]);

  async function handleArchive() {
    if (!archiveTarget) return false;
    setBusyId(archiveTarget.id);
    const result = await archiveJobTrackerEntry(archiveTarget.id);
    setBusyId(null);
    if (result.success) {
      notifyExtensionJobArchived(archiveTarget.id);
      onMutated?.();
      return true;
    }
    return false;
  }

  async function handleUnarchive(entryId: string) {
    setBusyId(entryId);
    const result = await unarchiveJobTrackerEntry(entryId);
    setBusyId(null);
    if (result.success) onMutated?.();
  }

  async function handleDelete() {
    if (!deleteTarget) return false;
    setBusyId(deleteTarget.id);
    try {
      const result = await deleteJobTrackerEntry(deleteTarget.id);
      if (result?.success === false) {
        setExtensionHint(result.error ?? "Could not delete this job. Try again.");
        return false;
      }
      onMutated?.();
      return true;
    } catch (error) {
      setExtensionHint(
        serverActionClientErrorMessage(error, "Could not delete this job. Try again."),
      );
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleApply(entry: JobTrackerSummary, journey: JourneyDisplay) {
    if (journey.applyButtonState !== "navigate" && journey.applyButtonState !== "reapply") return;

    setBusyId(entry.id);
    setExtensionHint(null);
    const result = await startJobApplyFromDashboard({
      jobId: entry.id,
      canonicalUrl: entry.canonicalUrl,
      openUrlFallback: extensionInstalled,
    });
    setBusyId(null);
    if (!result.success) {
      setExtensionHint(result.error);
      return;
    }
    if (!result.usedExtension && journey.applyButtonState === "navigate") {
      if (shouldShowExtensionInstallCta(extensionConnected)) {
        setExtensionHint(`Install the ${BRAND_FULL} extension to continue on the job page.`);
      } else {
        setExtensionHint("Open the job posting in your browser to continue with Apply assist.");
      }
    }
  }

  async function handleRetryTailor(entryId: string) {
    setBusyId(entryId);
    const result = await tailorJobTrackerEntry(entryId);
    setBusyId(null);
    if (result.success) {
      onMutated?.();
    }
  }

  async function handleMarkApplied(entryId: string) {
    setBusyId(entryId);
    const result = await markJobTrackerEntryApplied(entryId);
    setBusyId(null);
    if (result.success) onMutated?.();
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center text-sm text-muted-foreground">
        {archivedView ? "No archived jobs yet." : "No active jobs in your tracker."}
      </div>
    );
  }

  return (
    <>
      {extensionHint ? (
        <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          {extensionHint}{" "}
          <ExtensionInstallCta variant="inline-link" />
        </p>
      ) : null}
      <ul className="space-y-2">
        {entries.map((entry) => {
          const pipelineFailure = entry.pipelineStepFailure ?? null;
          const trackerPipeline = resolveTrackerPipelineView({
            status: entry.status,
            stepFailure: pipelineFailure,
            issueMessage: entry.issueMessage,
            extensionInstalled,
            appliedSource: entry.appliedSource,
          });
          const subtitle = trackerPipeline.subLabel;
          const issueSeverity = trackerPipeline.hasPipelineFailure
            ? "error"
            : trackerPipeline.hasWarning
              ? "warning"
              : null;
          const issueTooltip =
            issueSeverity === "error" || issueSeverity === "warning" ? subtitle : null;
          const journey = resolveJourneyDisplay(entry.status, trackerPipeline.hasPipelineFailure);
          const rowBusy = busyId === entry.id;
          const chrome = resolveDashboardTrackerRowChrome({
            status: entry.status,
            hasTailoredResume: entry.hasTailoredResume,
            savedAt: entry.savedAt,
            issueMessage: entry.issueMessage,
            journey,
            rowBusy,
            pipelineStepFailure: trackerPipeline.hasPipelineFailure,
            hasBlockingIssue: trackerPipeline.hasPipelineFailure,
          });

          return (
            <li key={entry.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onReview(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onReview(entry.id);
                  }
                }}
                aria-label={`Open review for ${entry.title}`}
                title="Click anywhere to open review"
                className="group cursor-pointer rounded-xl border border-border bg-surface/60 px-3 py-2 transition-all hover:border-primary/35 hover:bg-surface/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 py-0.5">
                      {onSelectedEntryIdsChange ? (
                        <input
                          type="checkbox"
                          checked={selectedIdSet.has(entry.id)}
                          onChange={() => toggleEntrySelected(entry.id)}
                          onClick={stopRowAction}
                          onKeyDown={stopRowAction}
                          className="h-4 w-4 shrink-0 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`Select ${entry.title}`}
                        />
                      ) : null}
                      <p
                        className="min-w-0 truncate text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
                        title={trackerRowLine(entry)}
                      >
                        {trackerRowLine(entry)}
                      </p>
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-primary/0 transition-all group-hover:text-primary/70 group-focus-visible:text-primary/70"
                        aria-hidden="true"
                      />
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={stopRowAction}
                      onKeyDown={stopRowAction}
                    >
                      {chrome.showResumeStudio ? (
                        chrome.resumeStudioEnabled ? (
                          <Link
                            href={`/dashboard/job-tracker/${entry.id}/resume`}
                            onClick={stopRowAction}
                            className={rowLinkActionClass()}
                            title={JOB_RESUME_STUDIO_LINK_TITLE}
                          >
                            {JOB_RESUME_STUDIO_LABEL}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        ) : (
                          <span
                            className={cn(rowLinkActionClass(), "cursor-not-allowed opacity-40")}
                            aria-disabled="true"
                            title="Resume optimization in progress"
                          >
                            {JOB_RESUME_STUDIO_LABEL}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )
                      ) : null}
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => onReview(entry.id)}
                        className={rowLinkActionClass()}
                      >
                        Review
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </button>
                      {archivedView ? (
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => void handleUnarchive(entry.id)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          aria-label={`Restore ${entry.title}`}
                          title="Restore to active jobs"
                        >
                          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={(event) => {
                            stopRowAction(event);
                            setArchiveTarget(entry);
                          }}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          aria-label={`Archive ${entry.title}`}
                          title="Archive job"
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={(event) => {
                          stopRowAction(event);
                          setDeleteTarget(entry);
                        }}
                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${entry.title}`}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <TrackerIssueIcon message={issueTooltip} severity={issueSeverity} />
                    </div>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="min-w-0 flex-1">
                      <PipelineBar
                        status={entry.status}
                        className="w-full"
                        progress={trackerPipeline.progress}
                        stageFailed={trackerPipeline.hasPipelineFailure}
                      />
                      {subtitle ? (
                        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          {chrome.showSpinner ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" aria-hidden="true" />
                          ) : null}
                          <p className="truncate">{subtitle}</p>
                        </div>
                      ) : chrome.showSpinner ? (
                        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" aria-hidden="true" />
                        </div>
                      ) : null}
                    </div>

                    <div
                      className="flex min-h-8 shrink-0 items-center justify-end gap-2"
                      onClick={stopRowAction}
                      onKeyDown={stopRowAction}
                    >
                      {!archivedView ? (
                        <>
                          {chrome.showRetryOptimize ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-primary/50 text-primary hover:bg-primary/10"
                              disabled={rowBusy}
                              onClick={() => void handleRetryTailor(entry.id)}
                            >
                              {rowBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : null}
                              Retry optimize
                            </Button>
                          ) : null}
                          {chrome.showMarkApplied ? (
                            <Button
                              type="button"
                              variant="mintOutline"
                              size="sm"
                              className="rounded-xl"
                              disabled={chrome.markAppliedDisabled}
                              onClick={() => void handleMarkApplied(entry.id)}
                            >
                              Mark applied
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant={chrome.applyCompleted ? "outline" : "mint"}
                            size="sm"
                            className={cn(
                              "rounded-xl",
                              chrome.applyInteractive && !rowBusy && "animate-mint-cta",
                            )}
                            disabled={chrome.applyDisabled}
                            onClick={() => void handleApply(entry, journey)}
                          >
                            {rowBusy && chrome.applyInteractive ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : null}
                            {chrome.applyLabel}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="Archive this job?"
        description={`“${archiveTarget?.title ?? "This job"}” will move to your archived list. You can restore it anytime.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this job?"
        description={`“${deleteTarget?.title ?? "This job"}” will be permanently removed from your tracker. This cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
