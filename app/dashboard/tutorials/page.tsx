import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth/cached-session";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { DashboardVideoTutorialsPanel } from "@/components/dashboard/DashboardVideoTutorialsPanel";
import { resolveDashboardTutorialVideos } from "@/lib/dashboard/dashboard-tutorial-videos";
import { getAppConfig } from "@/src/lib/services/config-service";

export default async function DashboardTutorialsPage() {
  const session = await getCachedServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const tutorialConfig = await getAppConfig("dashboardTutorialVideos");
  const videos = resolveDashboardTutorialVideos(tutorialConfig);

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tutorials…</p>}>
      <DashboardVideoTutorialsPanel videos={videos} />
    </Suspense>
  );
}
