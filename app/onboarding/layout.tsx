import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { checkDashboardSessionReady } from "@/lib/auth/require-dashboard-session";
import { OnboardingFlowShell } from "@/components/onboarding/OnboardingFlowShell";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const ignitionResume =
    headers().get("x-easysubmit-onboarding-ignition") === "1";

  if (!ignitionResume) {
    const dashboardReady = await checkDashboardSessionReady(session.user.id);
    if (dashboardReady) {
      redirect("/dashboard");
    }
  }

  return <OnboardingFlowShell>{children}</OnboardingFlowShell>;
}
