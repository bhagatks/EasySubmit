"use client";

import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { JobTrackerUrlDuplicateSummary } from "@/lib/job-tracker/job-tracker-url-duplicate";
import {
  formatJobTrackerDuplicateHeadline,
  jobTrackerDuplicateBlockMessage,
} from "@/lib/job-tracker/job-tracker-url-duplicate";
import { PurposeButton } from "@/components/ui/purpose-button";

type JobTrackerDuplicateConflictAlertProps = {
  existing: JobTrackerUrlDuplicateSummary;
  busy?: boolean;
  onArchive: () => void;
  onDelete: () => void;
};

export function JobTrackerDuplicateConflictAlert({
  existing,
  busy = false,
  onArchive,
  onDelete,
}: JobTrackerDuplicateConflictAlertProps) {
  const headline = formatJobTrackerDuplicateHeadline(existing);

  return (
    <div
      className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
      role="alert"
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">{headline} is already saved</p>
          <p className="text-muted-foreground">{jobTrackerDuplicateBlockMessage(existing)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <PurposeButton
              type="button"
              purpose="secondary"
              className="h-8 px-3 text-xs"
              disabled={busy}
              asChild
            >
              <Link href={`/dashboard/job-tracker?job=${existing.id}`}>Open existing</Link>
            </PurposeButton>
            <PurposeButton
              type="button"
              purpose="secondary"
              className="h-8 px-3 text-xs"
              disabled={busy}
              onClick={onArchive}
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Archiving…
                </>
              ) : (
                "Archive existing"
              )}
            </PurposeButton>
            <PurposeButton
              type="button"
              purpose="secondary"
              className="h-8 px-3 text-xs text-destructive hover:text-destructive"
              disabled={busy}
              onClick={onDelete}
            >
              Delete existing
            </PurposeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
