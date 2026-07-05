"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Briefcase, Plus } from "lucide-react";
import { DashboardHeaderHeroButton } from "@/components/dashboard/DashboardWorkspaceHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type JobTrackerHeaderActionsProps = {
  onAddJob: () => void;
  activeEntryIds?: string[];
  archivedEntryIds?: string[];
  selectedEntryIds?: string[];
  onSelectedEntryIdsChange?: (ids: string[]) => void;
  onArchiveSelected?: () => Promise<boolean>;
  onDeleteSelected?: () => Promise<boolean>;
};

export function JobTrackerHeaderActions({
  onAddJob,
  activeEntryIds = [],
  archivedEntryIds = [],
  selectedEntryIds = [],
  onSelectedEntryIdsChange,
  onArchiveSelected,
  onDeleteSelected,
}: JobTrackerHeaderActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archivedView = searchParams.get("view") === "archive";
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const toggleArchiveView = useCallback(() => {
    if (archivedView) {
      router.push("/dashboard/job-tracker", { scroll: false });
      return;
    }
    router.push("/dashboard/job-tracker?view=archive", { scroll: false });
  }, [archivedView, router]);

  const selectableEntryIds = useMemo(
    () => (archivedView ? archivedEntryIds : activeEntryIds),
    [activeEntryIds, archivedEntryIds, archivedView],
  );

  const selectedCount = selectedEntryIds.length;
  const allSelected =
    selectableEntryIds.length > 0 &&
    selectableEntryIds.every((id) => selectedEntryIds.includes(id));

  const showBulkActions = selectableEntryIds.length > 0;

  const handleToggleSelectAll = useCallback(() => {
    if (!onSelectedEntryIdsChange) return;
    onSelectedEntryIdsChange(allSelected ? [] : selectableEntryIds);
  }, [allSelected, onSelectedEntryIdsChange, selectableEntryIds]);

  const bulkConfirmTitle = archivedView
    ? "Delete selected jobs?"
    : "Archive selected jobs?";

  const bulkConfirmDescription = archivedView
    ? `${selectedCount} archived ${selectedCount === 1 ? "job" : "jobs"} will be permanently removed from your tracker. This cannot be undone.`
    : `${selectedCount} ${selectedCount === 1 ? "job" : "jobs"} will move to Archive. You can restore them anytime from the Archive view.`;

  const bulkConfirmLabel = archivedView ? "Delete permanently" : "Archive";

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {showBulkActions ? (
          <>
            <DashboardHeaderHeroButton
              type="button"
              variant="outline"
              className={cn(
                "border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:text-primary",
              )}
              onClick={handleToggleSelectAll}
            >
              {allSelected ? "Deselect" : "Select All"}
            </DashboardHeaderHeroButton>
            <DashboardHeaderHeroButton
              type="button"
              variant="outline"
              className={cn(
                archivedView
                  ? "border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : "border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:text-primary",
                selectedCount === 0 && "pointer-events-none opacity-50",
              )}
              disabled={selectedCount === 0}
              onClick={() => setBulkConfirmOpen(true)}
            >
              {archivedView ? "Delete All" : "Archive Selected"}
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
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={bulkConfirmTitle}
        description={bulkConfirmDescription}
        confirmLabel={bulkConfirmLabel}
        confirmVariant={archivedView ? "destructive" : "default"}
        onConfirm={async () => {
          if (archivedView) {
            if (!onDeleteSelected) return false;
            return onDeleteSelected();
          }
          if (!onArchiveSelected) return false;
          return onArchiveSelected();
        }}
      />
    </>
  );
}
