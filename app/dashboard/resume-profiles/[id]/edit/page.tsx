import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { getResumeProfileStudio } from "@/app/actions/resume-profiles";
import { getProfileDependentJobs } from "@/app/actions/job-resume-tailor";
import { resolveFeature } from "@/lib/features";
import { ResumeStudioEditor } from "@/components/dashboard/ResumeStudioEditor";

type EditResumeProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditResumeProfilePage({
  params,
}: EditResumeProfilePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const { id } = await params;
  const [result, enhance, dependents] = await Promise.all([
    getResumeProfileStudio(id),
    resolveFeature({ feature: "enhance", userId: session.user.id, surface: "resume" }),
    getProfileDependentJobs(id),
  ]);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ResumeStudioEditor
        profileId={result.profileId}
        initialTargetTitle={result.targetTitle}
        initialForm={result.form}
        rawResumeText={result.rawResumeText}
        enhanceWithAiEnabled={enhance.available}
        dependentJobs={dependents.success ? dependents.jobs : []}
      />
    </div>
  );
}
