import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { Puzzle } from "lucide-react";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { JobTrackerWorkspace } from "@/components/dashboard/JobTrackerWorkspace";
import { Button } from "@/components/ui/button";

type JobTrackerPageProps = {
  searchParams?: { view?: string };
};

export default async function JobTrackerPage(_props: JobTrackerPageProps) {
  const [result] = await Promise.all([listJobTrackerEntries()]);

  const entries = result.success ? result.entries : [];
  const autoArchiveAppliedJobs = result.success ? result.autoArchiveAppliedJobs : true;

  return (
    <DashboardWorkspacePage
      title="Job Tracker"
      description="Track each role on a simple pipeline — Review Screen for details, Apply when your resume is ready."
      aside={
        <Button variant="outline" size="sm" asChild>
          <Link href="/install">
            <Puzzle className="h-4 w-4" />
            Get extension
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {!result.success ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
            {result.error}
          </div>
        ) : (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading tracker…</div>}>
            <JobTrackerWorkspace
              entries={entries}
              autoArchiveAppliedJobs={autoArchiveAppliedJobs}
            />
          </Suspense>
        )}
      </div>
    </DashboardWorkspacePage>
  );
}
