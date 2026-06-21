import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { getResumeProfileStudio } from "@/app/actions/resume-profiles";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
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
  const [result, featureFlags] = await Promise.all([
    getResumeProfileStudio(id),
    getFeatureFlags(),
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
        enhanceWithAiEnabled={featureFlags.enhanceWithAiResumeProfile}
      />
    </div>
  );
}
