import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth/cached-session";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { KeyProtector } from "@/src/components/auth/KeyProtector";
import { DashboardSetupPrompts } from "@/components/dashboard/DashboardSetupPrompts";
import { DashboardIgnitionGuard } from "@/components/dashboard/DashboardIgnitionGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardRouteFallback } from "@/components/dashboard/DashboardRouteFallback";
import { getExtensionForceUpgradeConfig } from "@/lib/extension/force-upgrade-gate";
import { getAppConfig } from "@/src/lib/services/config-service";

type DashboardGateShellProps = {
  sessionUserId: string;
  children: React.ReactNode;
};

async function DashboardGateShell({ sessionUserId, children }: DashboardGateShellProps) {
  const user = await requireDashboardSession(sessionUserId);
  const [forceUpgrade, extensionInstallPrompt] = await Promise.all([
    getExtensionForceUpgradeConfig(),
    getAppConfig("extensionInstallPrompt"),
  ]);

  return (
    <>
      <DashboardIgnitionGuard vaultKeyId={user.vaultKeyId} />
      <DashboardSetupPrompts
        vaultKeyId={user.vaultKeyId}
        extensionInstallPrompt={extensionInstallPrompt}
      />
      <DashboardShell vaultKeyId={user.vaultKeyId}>{children}</DashboardShell>
    </>
  );
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCachedServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <KeyProtector>
      <Suspense fallback={<DashboardRouteFallback />}>
        <DashboardGateShell sessionUserId={session.user.id}>{children}</DashboardGateShell>
      </Suspense>
    </KeyProtector>
  );
}
