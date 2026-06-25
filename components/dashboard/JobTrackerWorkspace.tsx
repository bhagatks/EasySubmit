"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowUpRight, Briefcase } from "lucide-react";
import { listArchivedJobTrackerEntries, listJobTrackerEntries } from "@/app/actions/job-tracker";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import {
  defaultReviewScreenPanel,
  isReviewScreenPanel,
  type ReviewScreenPanel,
} from "@/lib/job-tracker/review-screen-ui";
import { JobTrackerPipeline } from "@/components/dashboard/JobTrackerPipeline";
import { ReviewScreen } from "@/components/dashboard/ReviewScreen";
import { useJobTrackerSync } from "@/lib/hooks/useJobTrackerSync";
import { ToastBanner } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { BRAND_FULL } from "@/lib/brand";
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
  const lastOpenedJobIdRef = useRef<string | null>(null);

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

  // Initial server render — Realtime + adaptive poll keep rows fresh.
  useEffect(() => {
    void refreshTrackerEntries();
  }, [refreshTrackerEntries]);

  useJobTrackerSync({
    enabled: !archivedView,
    onUpdate: setActiveEntries,
  });

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
      lastOpenedJobIdRef.current = id;
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
      if (!reviewJobId) return;
      router.replace(buildReviewUrl(reviewJobId, nextPanel), { scroll: false });
    },
    [buildReviewUrl, reviewJobId, router],
  );

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
              Install the {BRAND_FULL} extension and click <strong>Apply</strong> on any supported job
              posting. Use <strong>Review</strong> to open the Review Screen.
            </p>
            <Button variant="mint" className="mt-6" asChild>
              <Link href="/extension">
                Add extension <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )
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
