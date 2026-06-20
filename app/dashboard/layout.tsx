import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { KeyProtector } from "@/src/components/auth/KeyProtector";
import { DashboardIgnitionGuard } from "@/components/dashboard/DashboardIgnitionGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = await requireDashboardSession(session.user.id);

  return (
    <KeyProtector>
      <DashboardIgnitionGuard vaultKeyId={user.vaultKeyId} />
      <DashboardShell vaultKeyId={user.vaultKeyId}>{children}</DashboardShell>
    </KeyProtector>
  );
}
