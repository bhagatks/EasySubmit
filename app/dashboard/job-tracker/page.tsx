import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { ArrowUpRight, Briefcase, Puzzle } from "lucide-react";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";
import { authOptions } from "@/lib/auth";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { JobTrackerWorkspace } from "@/components/dashboard/JobTrackerWorkspace";
import { Button } from "@/components/ui/button";

type JobTrackerPageProps = {
  searchParams?: { view?: string };
};

export default async function JobTrackerPage({ searchParams }: JobTrackerPageProps) {
  const archivedView = searchParams?.view === "archive";
  const [result, session] = await Promise.all([
    listJobTrackerEntries(),
    getServerSession(authOptions),
  ]);

  const entries = result.success ? result.entries : [];
  const autoArchiveAppliedJobs = result.success ? result.autoArchiveAppliedJobs : true;

  return (
    <DashboardWorkspacePage
      title="Job Tracker"
      description="Track each role on a simple pipeline — Review Screen for details, Apply when your resume is ready."
      aside={
        <Button variant="outline" size="sm" asChild>
          <Link href="/extension">
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
        ) : entries.length > 0 || archivedView ? (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading tracker…</div>}>
            <JobTrackerWorkspace
              entries={entries}
              autoArchiveAppliedJobs={autoArchiveAppliedJobs}
            />
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">No jobs tracked yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Install the EasySubmit extension and use <strong>Save to Job Tracker</strong> on any
              supported job posting. Use <strong>Review</strong> to open the Review Screen.
            </p>
            <Button variant="mint" className="mt-6" asChild>
              <Link href="/extension">
                Add extension <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardWorkspacePage>
  );
}
