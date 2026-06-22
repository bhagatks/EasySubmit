import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { getJobResumeStudio } from "@/app/actions/job-resume-tailor";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { JobResumeStudioEditor } from "@/components/dashboard/JobResumeStudioEditor";

type JobResumePageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobResumeStudioPage({ params }: JobResumePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const { id } = await params;
  const [result, featureFlags] = await Promise.all([
    getJobResumeStudio(id),
    getFeatureFlags(),
  ]);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <JobResumeStudioEditor
        jobId={result.jobId}
        jobTitle={result.jobTitle}
        sourceProfileId={result.sourceProfileId}
        sourceProfileName={result.sourceProfileName}
        initialTargetTitle={result.targetTitle}
        initialForm={result.form}
        rawResumeText={result.rawResumeText}
        enhanceWithAiEnabled={featureFlags.enhanceWithAiResumeProfile}
      />
    </div>
  );
}
