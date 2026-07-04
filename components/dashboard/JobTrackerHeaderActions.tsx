"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Briefcase, Plus } from "lucide-react";
import { DashboardHeaderHeroButton } from "@/components/dashboard/DashboardWorkspaceHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type JobTrackerHeaderActionsProps = {
  onAddJob: () => void;
  archivedEntryIds?: string[];
  selectedEntryIds?: string[];
  onToggleSelectAll?: () => void;
  onDeleteSelected?: () => Promise<boolean>;
};

export function JobTrackerHeaderActions({
  onAddJob,
  archivedEntryIds = [],
  selectedEntryIds = [],
  onToggleSelectAll,
  onDeleteSelected,
}: JobTrackerHeaderActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archivedView = searchParams.get("view") === "archive";
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const toggleArchiveView = useCallback(() => {
    if (archivedView) {
      router.push("/dashboard/job-tracker", { scroll: false });
      return;
    }
    router.push("/dashboard/job-tracker?view=archive", { scroll: false });
  }, [archivedView, router]);

  const showArchiveBulkActions = archivedView && archivedEntryIds.length > 0;
  const selectedCount = selectedEntryIds.length;
  const allSelected =
    archivedEntryIds.length > 0 &&
    archivedEntryIds.every((id) => selectedEntryIds.includes(id));

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {showArchiveBulkActions ? (
          <>
            <DashboardHeaderHeroButton
              type="button"
              variant="outline"
              className={cn(
                "border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:text-primary",
              )}
              onClick={onToggleSelectAll}
            >
              {allSelected ? "Deselect" : "Select All"}
            </DashboardHeaderHeroButton>
            <DashboardHeaderHeroButton
              type="button"
              variant="outline"
              className={cn(
                "border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive",
                selectedCount === 0 && "pointer-events-none opacity-50",
              )}
              disabled={selectedCount === 0}
              onClick={() => setDeleteAllOpen(true)}
            >
              Delete All
            </DashboardHeaderHeroButton>
          </>
        ) : null}
        {!archivedView ? (
          <DashboardHeaderHeroButton type="button" onClick={onAddJob}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add job
          </DashboardHeaderHeroButton>
        ) : null}
        <DashboardHeaderHeroButton
          type="button"
          variant="outline"
          className={cn(
            "border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:text-primary",
          )}
          onClick={toggleArchiveView}
        >
          {archivedView ? (
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {archivedView ? "Tracker" : "Archive"}
        </DashboardHeaderHeroButton>
      </div>

      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Delete selected jobs?"
        description={`${selectedCount} archived ${
          selectedCount === 1 ? "job" : "jobs"
        } will be permanently removed from your tracker. This cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmVariant="destructive"
        onConfirm={async () => {
          if (!onDeleteSelected) return false;
          return onDeleteSelected();
        }}
      />
    </>
  );
}
