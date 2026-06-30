import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { listResumeProfiles } from "@/app/actions/resume-profiles";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { ResumeProfilesAddButton } from "@/components/dashboard/ResumeProfilesAddButton";
import { ResumeProfilesWorkspace } from "@/components/dashboard/ResumeProfilesWorkspace";

export default async function ResumeProfilesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const result = await listResumeProfiles();

  if (!result.success) {
    redirect("/login");
  }

  return (
    <DashboardWorkspacePage
      title="Resume profiles"
      description="Career profiles for autofill — role labels the list; contact name is secondary."
      aside={
        <ResumeProfilesAddButton
          canCreate={result.canCreate}
          maxProfiles={result.maxProfiles}
        />
      }
    >
      <ResumeProfilesWorkspace
        profiles={result.profiles}
        canDelete={result.canDelete}
        profileCount={result.profileCount}
        maxProfiles={result.maxProfiles}
        canCreate={result.canCreate}
      />
    </DashboardWorkspacePage>
  );
}
