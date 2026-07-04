"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { listArchivedJobTrackerEntries } from "@/app/actions/job-tracker";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import type { DashboardManualJobProfileOption } from "@/lib/job-tracker/dashboard-manual-capture";
import {
  fetchJobTrackerEntriesClient,
  useJobTrackerSync,
} from "@/lib/hooks/useJobTrackerSync";
import {
  defaultReviewScreenPanel,
  isReviewScreenPanel,
  type ReviewScreenPanel,
} from "@/lib/job-tracker/review-screen-ui";
import { JobTrackerPipeline } from "@/components/dashboard/JobTrackerPipeline";
import { ExtensionInstallCta } from "@/components/dashboard/ExtensionInstallCta";
import { JobTrackerManualAddModal } from "@/components/dashboard/JobTrackerManualAddModal";
import { ReviewScreen } from "@/components/dashboard/ReviewScreen";
import { serverActionClientErrorMessage } from "@/lib/server-action-client";
import { ToastBanner } from "@/components/ui/toast-banner";
import { PurposeButton } from "@/components/ui/purpose-button";
import { BRAND_FULL } from "@/lib/brand";
import { useDashboardExtensionConnected } from "@/lib/hooks/useDashboardExtensionConnected";
import { AnalyticsEvents, captureAnalyticsEvent, trackScreenOverlay } from "@/src/shared/analytics";

const APPLIED_ARCHIVE_TOAST_KEY = "easysubmit_applied_archive_toast_v1";

type JobTrackerWorkspaceProps = {
  entries: JobTrackerSummary[];
  autoArchiveAppliedJobs: boolean;
  resumeProfiles: DashboardManualJobProfileOption[];
  defaultProfileId: string | null;
  manualAddOpen: boolean;
  onManualAddOpenChange: (open: boolean) => void;
  onOpenManualAdd: () => void;
  selectedEntryIds?: string[];
  onSelectedEntryIdsChange?: (ids: string[]) => void;
  onArchivedEntryIdsChange?: (ids: string[]) => void;
  archiveRefreshToken?: number;
};

export function JobTrackerWorkspace({
  entries,
  autoArchiveAppliedJobs,
  resumeProfiles,
  defaultProfileId,
  manualAddOpen,
  onManualAddOpenChange,
  onOpenManualAdd,
  selectedEntryIds = [],
  onSelectedEntryIdsChange,
  onArchivedEntryIdsChange,
  archiveRefreshToken = 0,
}: JobTrackerWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("job");
  const panelParam = searchParams.get("panel");
  const archivedView = searchParams.get("view") === "archive";

  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [reviewPanel, setReviewPanel] = useState<ReviewScreenPanel>("job");
  const [activeEntries, setActiveEntries] = useState(entries);
  const [archivedEntries, setArchivedEntries] = useState<JobTrackerSummary[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastOpenedJobIdRef = useRef<string | null>(null);
  const extensionConnected = useDashboardExtensionConnected();

  const buildReviewUrl = useCallback(
    (jobId: string, panel: ReviewScreenPanel) => {
      const params = new URLSearchParams();
      params.set("job", jobId);
      params.set("panel", panel);
      if (archivedView) params.set("view", "archive");
      return `/dashboard/job-tracker?${params.toString()}`;
    },
    [archivedView],
  );

  useEffect(() => {
    setActiveEntries(entries);
  }, [entries]);

  const displayEntries = archivedView ? archivedEntries : activeEntries;

  const hasAppliedJob = useMemo(
    () => activeEntries.some((entry) => entry.status === "APPLIED"),
    [activeEntries],
  );

  useEffect(() => {
    if (!hasAppliedJob || !autoArchiveAppliedJobs) return;
    try {
      if (window.localStorage.getItem(APPLIED_ARCHIVE_TOAST_KEY)) return;
      setShowArchiveToast(true);
      window.localStorage.setItem(APPLIED_ARCHIVE_TOAST_KEY, "1");
    } catch {
      setShowArchiveToast(true);
    }
  }, [hasAppliedJob, autoArchiveAppliedJobs]);

  useEffect(() => {
    if (!jobIdFromUrl) {
      lastOpenedJobIdRef.current = null;
      return;
    }

    setReviewJobId(jobIdFromUrl);

    if (isReviewScreenPanel(panelParam)) {
      setReviewPanel(panelParam);
      lastOpenedJobIdRef.current = jobIdFromUrl;
      return;
    }

    if (lastOpenedJobIdRef.current !== jobIdFromUrl) {
      const entry = [...activeEntries, ...archivedEntries].find((item) => item.id === jobIdFromUrl);
      setReviewPanel(entry ? defaultReviewScreenPanel(entry.status) : "job");
      lastOpenedJobIdRef.current = jobIdFromUrl;
    }
  }, [jobIdFromUrl, panelParam, activeEntries, archivedEntries]);

  const loadArchived = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const result = await listArchivedJobTrackerEntries();
      if (result.success) {
        setArchivedEntries(result.entries);
      }
    } catch (error) {
      console.warn(
        "EasySubmit: could not load archived jobs",
        serverActionClientErrorMessage(error, "Archive load failed"),
      );
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const refreshTrackerEntries = useCallback(async () => {
    if (!archivedView) {
      const entries = await fetchJobTrackerEntriesClient();
      if (entries) {
        setActiveEntries(entries);
      }
    }
    if (archivedView) {
      await loadArchived();
    }
  }, [archivedView, loadArchived]);

  useJobTrackerSync({
    enabled: !archivedView,
    onUpdate: setActiveEntries,
  });

  useEffect(() => {
    if (archivedView) {
      void loadArchived();
    }
  }, [archivedView, loadArchived, refreshKey, archiveRefreshToken]);

  useEffect(() => {
    onArchivedEntryIdsChange?.(archivedEntries.map((entry) => entry.id));
  }, [archivedEntries, onArchivedEntryIdsChange]);

  useEffect(() => {
    if (!archivedView) {
      onSelectedEntryIdsChange?.([]);
    }
  }, [archivedView, onSelectedEntryIdsChange]);

  const clearReviewUrlParams = useCallback(() => {
    if (!jobIdFromUrl && !panelParam) return;
    const params = new URLSearchParams();
    if (archivedView) params.set("view", "archive");
    const qs = params.toString();
    router.replace(qs ? `/dashboard/job-tracker?${qs}` : "/dashboard/job-tracker", {
      scroll: false,
    });
  }, [archivedView, jobIdFromUrl, panelParam, router]);

  const openReview = useCallback(
    (id: string, preferredPanel?: ReviewScreenPanel) => {
      const entry = [...activeEntries, ...archivedEntries].find((item) => item.id === id);
      const nextPanel =
        preferredPanel ?? (entry ? defaultReviewScreenPanel(entry.status) : "job");
      setReviewJobId(id);
      setReviewPanel(nextPanel);
      lastOpenedJobIdRef.current = id;
      captureAnalyticsEvent(AnalyticsEvents.REVIEW_SCREEN_OPENED, {
        entry_id: id,
        entry_status: entry?.status ?? "unknown",
      });
      trackScreenOverlay("review_screen", {
        route: `/dashboard/job-tracker?job=${id}`,
        params: {
          entryId: id,
          panel: nextPanel,
          entryStatus: entry?.status ?? "unknown",
        },
        flags: { preferredPanel: preferredPanel ?? null },
      });
      router.replace(buildReviewUrl(id, nextPanel), { scroll: false });
    },
    [activeEntries, archivedEntries, buildReviewUrl, router],
  );

  const closeReview = useCallback(() => {
    setReviewJobId(null);
    lastOpenedJobIdRef.current = null;
    clearReviewUrlParams();
  }, [clearReviewUrlParams]);

  const handlePanelChange = useCallback(
    (nextPanel: ReviewScreenPanel) => {
      setReviewPanel(nextPanel);
      captureAnalyticsEvent(AnalyticsEvents.REVIEW_TAB_CHANGED, { tab: nextPanel });
      trackScreenOverlay("review_screen", {
        route: reviewJobId ? `/dashboard/job-tracker?job=${reviewJobId}` : "/dashboard/job-tracker",
        params: { entryId: reviewJobId, panel: nextPanel },
        flags: { tabChange: true },
      });
      if (!reviewJobId) return;
      router.replace(buildReviewUrl(reviewJobId, nextPanel), { scroll: false });
    },
    [buildReviewUrl, reviewJobId, router],
  );

  const openManualAdd = onOpenManualAdd;

  const handleManualJobCreated = useCallback(
    (_entryId: string) => {
      void refreshTrackerEntries();
    },
    [refreshTrackerEntries],
  );

  const handleMutated = useCallback(() => {
    setRefreshKey((value) => value + 1);
    void refreshTrackerEntries();
  }, [refreshTrackerEntries]);

  return (
    <>
      {showArchiveToast && autoArchiveAppliedJobs ? (
        <ToastBanner
          message="Applied jobs will move to Archive automatically after 24 hours. Use Archive above anytime."
          onDismiss={() => setShowArchiveToast(false)}
        />
      ) : null}

      {archiveLoading && archivedView && archivedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading archive…</p>
      ) : displayEntries.length === 0 ? (
        archivedView ? (
          <p className="text-sm text-muted-foreground">No archived jobs yet.</p>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">No jobs tracked yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {extensionConnected
                ? "Add a job here to tailor a resume for that role, or save roles from career sites with the extension on this browser."
                : `Add a job here to tailor a resume for that role, or save roles from career sites with the ${BRAND_FULL} extension.`}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PurposeButton type="button" purpose="primary" onClick={openManualAdd}>
                Add to Job Tracker
              </PurposeButton>
              <ExtensionInstallCta variant="tracker-button" />
            </div>
          </div>
        )
      ) : (
        <JobTrackerPipeline
          entries={displayEntries}
          archivedView={archivedView}
          onReview={openReview}
          onMutated={handleMutated}
          selectedEntryIds={archivedView ? selectedEntryIds : undefined}
          onSelectedEntryIdsChange={archivedView ? onSelectedEntryIdsChange : undefined}
        />
      )}

      <JobTrackerManualAddModal
        open={manualAddOpen}
        onOpenChange={onManualAddOpenChange}
        onCreated={handleManualJobCreated}
        profiles={resumeProfiles}
        defaultProfileId={defaultProfileId}
      />

      <ReviewScreen
        jobId={reviewJobId}
        panel={reviewPanel}
        open={Boolean(reviewJobId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeReview();
        }}
        onPanelChange={handlePanelChange}
        onEntrySaved={() => {
          void refreshTrackerEntries();
        }}
      />
    </>
  );
}
