"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive } from "lucide-react";
import { listArchivedJobTrackerEntries, listJobTrackerEntries } from "@/app/actions/job-tracker";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import {
  defaultReviewScreenPanel,
  isReviewScreenPanel,
  type ReviewScreenPanel,
} from "@/lib/job-tracker/review-screen-ui";
import { JobTrackerPipeline } from "@/components/dashboard/JobTrackerPipeline";
import { ReviewScreen } from "@/components/dashboard/ReviewScreen";
import { ToastBanner } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { useRegisterDashboardHeaderActions } from "@/components/dashboard/DashboardWorkspaceHeader";

const APPLIED_ARCHIVE_TOAST_KEY = "easysubmit_applied_archive_toast_v1";

type JobTrackerWorkspaceProps = {
  entries: JobTrackerSummary[];
  autoArchiveAppliedJobs: boolean;
};

export function JobTrackerWorkspace({ entries, autoArchiveAppliedJobs }: JobTrackerWorkspaceProps) {
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
    if (!jobIdFromUrl) return;

    const entry = [...activeEntries, ...archivedEntries].find((item) => item.id === jobIdFromUrl);
    setReviewJobId(jobIdFromUrl);
    setReviewPanel(
      isReviewScreenPanel(panelParam)
        ? panelParam
        : entry
          ? defaultReviewScreenPanel(entry.status)
          : "job",
    );
  }, [jobIdFromUrl, panelParam, activeEntries, archivedEntries]);

  const loadArchived = useCallback(async () => {
    setArchiveLoading(true);
    const result = await listArchivedJobTrackerEntries();
    setArchiveLoading(false);
    if (result.success) {
      setArchivedEntries(result.entries);
    }
  }, []);

  const refreshTrackerEntries = useCallback(async () => {
    const result = await listJobTrackerEntries();
    if (result.success) {
      setActiveEntries(result.entries);
    }
    if (archivedView) {
      await loadArchived();
    }
  }, [archivedView, loadArchived]);

  useEffect(() => {
    function handleResume() {
      if (document.visibilityState !== "visible") return;
      void refreshTrackerEntries();
    }

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
    };
  }, [refreshTrackerEntries]);

  useEffect(() => {
    if (archivedView) {
      void loadArchived();
    }
  }, [archivedView, loadArchived, refreshKey]);

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
    },
    [activeEntries, archivedEntries],
  );

  const closeReview = useCallback(() => {
    setReviewJobId(null);
    clearReviewUrlParams();
  }, [clearReviewUrlParams]);

  const handlePanelChange = useCallback((nextPanel: ReviewScreenPanel) => {
    setReviewPanel(nextPanel);
  }, []);

  const toggleArchiveView = useCallback(() => {
    if (archivedView) {
      router.push("/dashboard/job-tracker", { scroll: false });
      return;
    }
    router.push("/dashboard/job-tracker?view=archive", { scroll: false });
  }, [archivedView, router]);

  const archiveHeaderButton = useMemo(
    () => (
      <Button
        type="button"
        variant={archivedView ? "default" : "outline"}
        size="sm"
        className="rounded-xl"
        onClick={toggleArchiveView}
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        {archivedView ? "Active jobs" : "Archive"}
      </Button>
    ),
    [archivedView, toggleArchiveView],
  );

  useRegisterDashboardHeaderActions(archiveHeaderButton);

  const handleMutated = useCallback(() => {
    setRefreshKey((value) => value + 1);
    void refreshTrackerEntries();
    router.refresh();
  }, [refreshTrackerEntries, router]);

  return (
    <>
      {showArchiveToast && autoArchiveAppliedJobs ? (
        <ToastBanner
          message="Applied jobs will move to Archive automatically after 24 hours. Open Archive from the header anytime."
          onDismiss={() => setShowArchiveToast(false)}
        />
      ) : null}

      {archiveLoading && archivedView && archivedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading archive…</p>
      ) : (
        <JobTrackerPipeline
          entries={displayEntries}
          archivedView={archivedView}
          onReview={openReview}
          onMutated={handleMutated}
        />
      )}

      <ReviewScreen
        jobId={reviewJobId}
        panel={reviewPanel}
        open={Boolean(reviewJobId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeReview();
        }}
        onPanelChange={handlePanelChange}
      />
    </>
  );
}
