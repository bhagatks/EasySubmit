import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";
import { authOptions } from "@/lib/auth";
import { JobTrackerPageContent } from "@/components/dashboard/JobTrackerPageContent";
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
    <JobTrackerPageContent
      entries={entries}
      autoArchiveAppliedJobs={autoArchiveAppliedJobs}
      resumeProfiles={resumeProfiles}
      defaultProfileId={defaultProfileId}
      loadError={result.success ? null : result.error}
    />
  );
}
