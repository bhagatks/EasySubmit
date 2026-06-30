"use client";

import { Suspense, useCallback, useState } from "react";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import type { DashboardManualJobProfileOption } from "@/lib/job-tracker/dashboard-manual-capture";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { JobTrackerHeaderActions } from "@/components/dashboard/JobTrackerHeaderActions";
import { JobTrackerWorkspace } from "@/components/dashboard/JobTrackerWorkspace";
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

  const openManualAdd = useCallback(() => {
    captureAnalyticsEvent(AnalyticsEvents.JOB_TRACKER_MANUAL_ADD_OPENED, {
      surface: "dashboard",
    });
    setManualAddOpen(true);
  }, []);

  return (
    <DashboardWorkspacePage
      title="Job Tracker"
      description="Track each role on a simple pipeline — Review Screen for details, Apply when your resume is ready."
      aside={
        <Suspense fallback={null}>
          <JobTrackerHeaderActions onAddJob={openManualAdd} />
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
          />
        </Suspense>
      )}
    </DashboardWorkspacePage>
  );
}
