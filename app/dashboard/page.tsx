import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth/cached-session";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardOverviewSkeleton } from "@/components/dashboard/DashboardRouteFallback";

type DashboardOverviewLoaderProps = {
  userFirstName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

async function DashboardOverviewLoader({
  userFirstName,
  userName,
  userEmail,
}: DashboardOverviewLoaderProps) {
  return (
    <DashboardOverview
      userFirstName={userFirstName}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

export default async function DashboardPage() {
  const session = await getCachedServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<DashboardOverviewSkeleton />}>
      <DashboardOverviewLoader
        userFirstName={session.user.firstName}
        userName={session.user.name}
        userEmail={session.user.email}
      />
    </Suspense>
  );
}
