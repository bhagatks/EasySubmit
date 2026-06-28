import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { AtsScoresWorkspace } from "@/components/dashboard/AtsScoresWorkspace";

export const dynamic = "force-dynamic";

export default async function AtsScoresPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const result = await listJobTrackerEntries();
  const entries = result.success ? result.entries : [];

  return (
    <DashboardWorkspacePage
      title="ATS Scores"
      description="See how your tailored resume scores across Workday, Greenhouse, Lever, iCIMS, Taleo, and SuccessFactors — click any job to expand."
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <AtsScoresWorkspace entries={entries} />
      </Suspense>
    </DashboardWorkspacePage>
  );
}
