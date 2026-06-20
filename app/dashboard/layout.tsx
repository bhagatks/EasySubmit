import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { KeyProtector } from "@/src/components/auth/KeyProtector";
import { DashboardIgnitionGuard } from "@/components/dashboard/DashboardIgnitionGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vaultKeyId: true },
  });

  return (
    <KeyProtector>
      <DashboardIgnitionGuard />
      <DashboardShell vaultKeyId={user?.vaultKeyId ?? null}>{children}</DashboardShell>
    </KeyProtector>
  );
}
