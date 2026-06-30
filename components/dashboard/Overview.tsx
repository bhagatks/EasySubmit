import { getDashboardStats } from "@/app/actions/dashboard/stats";
import { DashboardWorkspaceShell } from "@/components/dashboard/DashboardWorkspacePage";
import { OverviewHeaderActions } from "@/components/dashboard/overview/OverviewHeaderActions";
import { OverviewActionQueue } from "@/components/dashboard/overview/OverviewActionQueue";
import { OverviewComingSoon } from "@/components/dashboard/overview/OverviewComingSoon";
import { OverviewPipelineStrip } from "@/components/dashboard/overview/OverviewPipelineStrip";
import { OverviewRightRail } from "@/components/dashboard/overview/OverviewRightRail";
import { getDisplayName } from "@/lib/dashboard/user-display";
import { getTimeOfDayGreeting } from "@/lib/dashboard/overview-stats";

type DashboardOverviewProps = {
  userFirstName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

export async function DashboardOverview({
  userFirstName,
  userName,
  userEmail,
}: DashboardOverviewProps) {
  const firstName = getDisplayName(userFirstName, userEmail, userName);
  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <DashboardWorkspaceShell>
        <div className="rounded-xl border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
          Could not load dashboard stats. Refresh to try again.
        </div>
      </DashboardWorkspaceShell>
    );
  }

  const { stats } = result;
  const { overview } = stats;
  const greeting = getTimeOfDayGreeting();
  const waitingLabel =
    overview.waitingCount === 1 ? "1 job" : `${overview.waitingCount} jobs`;

  return (
    <DashboardWorkspaceShell className="space-y-8">
      <OverviewHeaderActions />

      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.waitingCount > 0 ? (
            <>
              You have <span className="font-medium text-foreground">{waitingLabel}</span> waiting on
              you. Let&apos;s knock a few out.
            </>
          ) : (
            <>Your pipeline is clear — capture a new role when you&apos;re ready.</>
          )}
        </p>
      </section>

      <OverviewPipelineStrip
        pipeline={overview.pipeline}
        capturedThisWeek={overview.capturedThisWeek}
        appliedThisWeek={overview.appliedThisWeek}
      />

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <OverviewActionQueue items={overview.actionQueue} waitingCount={overview.waitingCount} />
        <OverviewRightRail weeklyProgress={overview.weeklyProgress} />
      </div>

      <OverviewComingSoon />
    </DashboardWorkspaceShell>
  );
}
