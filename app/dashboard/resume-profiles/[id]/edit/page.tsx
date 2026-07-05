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
  const result = await getResumeProfileStudio(id);
  if (!result.success) {
    notFound();
  }

  const [enhance, rulesV2, dependents] = await Promise.all([
    resolveFeature({ feature: "enhance", userId: session.user.id, surface: "resume" }),
    resolveFeature({
      feature: "resumeRulesV2",
      userId: session.user.id,
      surface: "resume",
      pageLengthPreference: result.form.pageLengthPreference,
    }),
    getProfileDependentJobs(id),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ResumeStudioEditor
        profileId={result.profileId}
        initialTargetTitle={result.targetTitle}
        initialForm={result.form}
        rawResumeText={result.rawResumeText}
        enhanceWithAiEnabled={enhance.aiAvailable}
        dependentJobs={dependents.success ? dependents.jobs : []}
        resumeRulesV2Enabled={rulesV2.enabled}
      />
    </div>
  );
}
