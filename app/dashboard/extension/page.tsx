import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth/cached-session";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { DashboardExtensionInstallPanel } from "@/components/dashboard/DashboardExtensionInstallPanel";
import { getExtensionForceUpgradeConfig } from "@/lib/extension/force-upgrade-gate";

export default async function DashboardExtensionPage() {
  const session = await getCachedServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);
  const forceUpgrade = await getExtensionForceUpgradeConfig();

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading extension setup…</p>}>
      <DashboardExtensionInstallPanel storeUrl={forceUpgrade.updateUrl} />
    </Suspense>
  );
}
