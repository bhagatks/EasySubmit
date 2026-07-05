"use client";

import { Suspense, useCallback, useState } from "react";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import type { DashboardManualJobProfileOption } from "@/lib/job-tracker/dashboard-manual-capture";
import {
  archiveJobTrackerEntries,
  deleteJobTrackerEntries,
} from "@/app/actions/job-tracker";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { JobTrackerHeaderActions } from "@/components/dashboard/JobTrackerHeaderActions";
import { JobTrackerWorkspace } from "@/components/dashboard/JobTrackerWorkspace";
import { notifyExtensionJobArchived } from "@/lib/extension/start-job-apply-from-dashboard";
import { AnalyticsEvents, captureAnalyticsEvent } from "@/src/shared/analytics";

type JobTrackerPageContentProps = {
  entries: JobTrackerSummary[];
  autoArchiveAppliedJobs: boolean;
  resumeProfiles: DashboardManualJobProfileOption[];
  defaultProfileId: string | null;
  loadError: string | null;
};

export function JobTrackerPageContent({
  entries,
  autoArchiveAppliedJobs,
  resumeProfiles,
  defaultProfileId,
  loadError,
}: JobTrackerPageContentProps) {
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [activeEntryIds, setActiveEntryIds] = useState<string[]>([]);
  const [archivedEntryIds, setArchivedEntryIds] = useState<string[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [archiveRefreshToken, setArchiveRefreshToken] = useState(0);

  const openManualAdd = useCallback(() => {
    captureAnalyticsEvent(AnalyticsEvents.JOB_TRACKER_MANUAL_ADD_OPENED, {
      surface: "dashboard",
    });
    setManualAddOpen(true);
  }, []);

  const bumpArchiveRefresh = useCallback(() => {
    setArchiveRefreshToken((value) => value + 1);
  }, []);

  return (
    <DashboardWorkspacePage
      title="Job Tracker"
      description="Track each role on a simple pipeline — Review Screen for details, Apply when your resume is ready."
      aside={
        <Suspense fallback={null}>
          <JobTrackerHeaderActions
            onAddJob={openManualAdd}
            activeEntryIds={activeEntryIds}
            archivedEntryIds={archivedEntryIds}
            selectedEntryIds={selectedEntryIds}
            onSelectedEntryIdsChange={setSelectedEntryIds}
            onArchiveSelected={async () => {
              const result = await archiveJobTrackerEntries(selectedEntryIds);
              if (result.success) {
                for (const id of selectedEntryIds) {
                  notifyExtensionJobArchived(id);
                }
                setSelectedEntryIds([]);
                bumpArchiveRefresh();
              }
              return result.success;
            }}
            onDeleteSelected={async () => {
              const result = await deleteJobTrackerEntries(selectedEntryIds);
              if (result.success) {
                setSelectedEntryIds([]);
                bumpArchiveRefresh();
              }
              return result.success;
            }}
          />
        </Suspense>
      }
    >
      {loadError ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
          {loadError}
        </div>
      ) : (
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading tracker…</div>}>
          <JobTrackerWorkspace
            entries={entries}
            autoArchiveAppliedJobs={autoArchiveAppliedJobs}
            resumeProfiles={resumeProfiles}
            defaultProfileId={defaultProfileId}
            manualAddOpen={manualAddOpen}
            onManualAddOpenChange={setManualAddOpen}
            onOpenManualAdd={openManualAdd}
            selectedEntryIds={selectedEntryIds}
            onSelectedEntryIdsChange={setSelectedEntryIds}
            onActiveEntryIdsChange={setActiveEntryIds}
            onArchivedEntryIdsChange={setArchivedEntryIds}
            archiveRefreshToken={archiveRefreshToken}
          />
        </Suspense>
      )}
    </DashboardWorkspacePage>
  );
}
