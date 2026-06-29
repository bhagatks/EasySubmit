import { Suspense } from "react";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";
import { authOptions } from "@/lib/auth";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { JobTrackerWorkspace } from "@/components/dashboard/JobTrackerWorkspace";
import { listExtensionResumeProfiles } from "@/lib/extension/resume-profiles";

type JobTrackerPageProps = {
  searchParams?: { view?: string };
};

export default async function JobTrackerPage(_props: JobTrackerPageProps) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const [result, profilePayload] = await Promise.all([
    listJobTrackerEntries(),
    userId ? listExtensionResumeProfiles(userId) : Promise.resolve(null),
  ]);

  const entries = result.success ? result.entries : [];
  const autoArchiveAppliedJobs = result.success ? result.autoArchiveAppliedJobs : true;
  const resumeProfiles = profilePayload?.profiles ?? [];
  const defaultProfileId = profilePayload?.defaultProfileId ?? null;

  return (
    <DashboardWorkspacePage
      title="Job Tracker"
      description="Track each role on a simple pipeline — Review Screen for details, Apply when your resume is ready."
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
              resumeProfiles={resumeProfiles}
              defaultProfileId={defaultProfileId}
            />
          </Suspense>
        )}
      </div>
    </DashboardWorkspacePage>
  );
}
