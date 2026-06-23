import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { listResumeProfiles } from "@/app/actions/resume-profiles";
import { NewResumeProfileChooser } from "@/components/dashboard/NewResumeProfileChooser";

export default async function NewResumeProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const result = await listResumeProfiles();
  if (!result.success) {
    redirect("/login");
  }

  if (!result.canCreate) {
    redirect("/dashboard/resume-profiles");
  }

  return (
    <NewResumeProfileChooser
      profileCount={result.profileCount}
      maxProfiles={result.maxProfiles}
    />
  );
}
