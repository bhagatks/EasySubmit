import { TrendingUp } from "lucide-react";
import type { OverviewWeeklyProgress } from "@/lib/dashboard/overview-stats";
import { weeklyProgressBarPercent } from "@/lib/dashboard/overview-stats";

type OverviewRightRailProps = {
  weeklyProgress: OverviewWeeklyProgress;
};

const WEEKLY_METRICS: Array<{
  key: keyof OverviewWeeklyProgress;
  label: string;
}> = [
  { key: "captured", label: "Captured" },
  { key: "resumesGenerated", label: "Resumes generated" },
  { key: "applicationsSent", label: "Applications sent" },
];

export function OverviewRightRail({ weeklyProgress }: OverviewRightRailProps) {
  const maxWeekly = Math.max(
    weeklyProgress.captured,
    weeklyProgress.resumesGenerated,
    weeklyProgress.applicationsSent,
    1,
  );

  return (
    <aside>
      <section className="rounded-xl border border-border bg-surface/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold">This week</h2>
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="mt-4 space-y-3">
          {WEEKLY_METRICS.map((metric) => {
            const value = weeklyProgress[metric.key];
            const percent = weeklyProgressBarPercent(value, maxWeekly);

            return (
              <div key={metric.key}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-medium tabular-nums text-foreground">{value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
