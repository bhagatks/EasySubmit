"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Plus } from "lucide-react";
import { DashboardHeaderHeroButton } from "@/components/dashboard/DashboardWorkspaceHeader";
import { cn } from "@/lib/utils";

type JobTrackerHeaderActionsProps = {
  onAddJob: () => void;
};

export function JobTrackerHeaderActions({ onAddJob }: JobTrackerHeaderActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archivedView = searchParams.get("view") === "archive";

  const toggleArchiveView = useCallback(() => {
    if (archivedView) {
      router.push("/dashboard/job-tracker", { scroll: false });
      return;
    }
    router.push("/dashboard/job-tracker?view=archive", { scroll: false });
  }, [archivedView, router]);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        {archivedView ? "Active jobs" : "Archive"}
      </DashboardHeaderHeroButton>
    </div>
  );
}
