"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  AlertCircle,
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
  unarchiveJobTrackerEntry,
} from "@/app/actions/job-tracker";
import { PipelineBar } from "@/components/dashboard/PipelineBar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BRAND_FULL } from "@/lib/brand";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import { resolveJourneyDisplay, type JourneyDisplay } from "@/src/shared/journey-display";
import {
  notifyExtensionJobArchived,
  readExtensionIdForDashboard,
  startJobApplyFromDashboard,
} from "@/lib/extension/start-job-apply-from-dashboard";
import { cn } from "@/lib/utils";

type JobTrackerPipelineProps = {
  entries: JobTrackerSummary[];
  archivedView?: boolean;
  onReview: (entryId: string) => void;
  onMutated?: () => void;
};

function stopRowAction(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

function trackerRowLine(entry: JobTrackerSummary): string {
  const role = entry.title.trim() || "Role unknown";
  const company = entry.company?.trim() || "Company unknown";
  return `${role} · ${company}`;
}

function stageAssistSubtitle(extensionInstalled: boolean): string {
  return extensionInstalled ? "Apply assist active" : "Continue on job page";
}

function applyButtonLabel(journey: JourneyDisplay): string {
  if (journey.applyButtonState === "navigate") return "Apply assist";
  if (journey.applyButtonState === "reapply") return "Re-apply";
  if (journey.label === "Apply") return "Apply";
  return journey.label;
}

function isApplyInteractive(journey: JourneyDisplay): boolean {
  return journey.applyButtonState === "navigate" || journey.applyButtonState === "reapply";
}

function EntryIssueButton({ message }: { message: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasIssue = Boolean(message?.trim());
  const displayMessage = hasIssue ? message!.trim() : "No issues detected for this job.";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={(event) => {
          stopRowAction(event);
          setOpen((value) => !value);
        }}
        className={cn(
          "rounded-lg p-1 transition-colors",
          hasIssue
            ? "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
            : "text-muted-foreground/45 hover:bg-muted/50 hover:text-muted-foreground",
        )}
        aria-label={hasIssue ? "View job issue" : "No issues"}
        aria-expanded={open}
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-surface p-3 text-xs shadow-lg"
          role="dialog"
          aria-label="Job issue details"
        >
          <p className="font-semibold text-foreground">{hasIssue ? "Capture gap" : "Status"}</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{displayMessage}</p>
        </div>
      ) : null}
    </div>
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
}: JobTrackerPipelineProps) {
  const [deleteTarget, setDeleteTarget] = useState<JobTrackerSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<JobTrackerSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extensionHint, setExtensionHint] = useState<string | null>(null);
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  useEffect(() => {
    setExtensionInstalled(Boolean(readExtensionIdForDashboard()));
  }, []);

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
    const result = await deleteJobTrackerEntry(deleteTarget.id);
    setBusyId(null);
    if (result.success) {
      onMutated?.();
      return true;
    }
    return false;
  }

  async function handleApply(entry: JobTrackerSummary, journey: JourneyDisplay) {
    if (!isApplyInteractive(journey)) return;

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
      setExtensionHint(`Install the ${BRAND_FULL} extension to continue on the job page.`);
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
          <Link href="/extension" className="font-semibold underline">
            Get extension
          </Link>
        </p>
      ) : null}
      <ul className="space-y-2">
        {entries.map((entry) => {
          const journey = resolveJourneyDisplay(
            entry.status,
            Boolean(entry.issueMessage),
          );
          const rowBusy = busyId === entry.id;
          const showSpinner = journey.stage === 1 && entry.status === "CAPTURED";
          const stage2 = journey.applyButtonState === "navigate";
          const stage3 = journey.applyButtonState === "completed";
          const stageError = journey.stage === "error";
          const subtitle = stage2 ? stageAssistSubtitle(extensionInstalled) : journey.label;

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
                    <div className="flex min-w-0 flex-1 items-center gap-1 py-0.5">
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
                      {entry.hasTailoredResume &&
                      (entry.status === "RESUME_READY" ||
                        entry.status === "READY_TO_APPLY" ||
                        entry.status === "APPLIED") ? (
                        <Link
                          href={`/dashboard/job-tracker/${entry.id}/resume`}
                          onClick={stopRowAction}
                          className={rowLinkActionClass()}
                          title="Open tailored resume in Studio Edition"
                        >
                          Studio Edition
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
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
                      <EntryIssueButton message={entry.issueMessage} />
                    </div>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="min-w-0 flex-1">
                      <PipelineBar status={entry.status} className="w-full" />
                      <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        {showSpinner ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" aria-hidden="true" />
                        ) : null}
                        <p className="truncate">{subtitle}</p>
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center justify-end gap-2"
                      onClick={stopRowAction}
                      onKeyDown={stopRowAction}
                    >
                      {!archivedView ? (
                        stageError ? (
                          <>
                            <span className="inline-flex min-h-8 items-center rounded-xl bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {journey.label}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={rowBusy}
                              onClick={() => onReview(entry.id)}
                            >
                              Retry
                            </Button>
                          </>
                        ) : (
                          <>
                            {stage2 && !stage3 ? (
                              <Button
                                type="button"
                                variant="mintOutline"
                                size="sm"
                                className="rounded-xl"
                                disabled={rowBusy}
                                onClick={() => void handleMarkApplied(entry.id)}
                              >
                                Mark applied
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant={stage3 ? "outline" : "mint"}
                              size="sm"
                              className={cn(
                                "rounded-xl",
                                isApplyInteractive(journey) && !rowBusy && "animate-mint-cta",
                              )}
                              disabled={
                                stage3 ||
                                !isApplyInteractive(journey) ||
                                rowBusy ||
                                journey.applyButtonState === "disabled" ||
                                journey.applyButtonState === "hidden" ||
                                journey.applyButtonState === "completed"
                              }
                              onClick={() => void handleApply(entry, journey)}
                            >
                              {rowBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : null}
                              {stage3 ? "Completed" : applyButtonLabel(journey)}
                            </Button>
                          </>
                        )
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
