import { DASHBOARD_WORKSPACE_WIDTH_CLASS } from "@/lib/dashboard/dashboard-layout";
import { cn } from "@/lib/utils";

type DashboardPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardPlaceholder({ title, description }: DashboardPlaceholderProps) {
  return (
    <div className={cn(DASHBOARD_WORKSPACE_WIDTH_CLASS, "rounded-2xl border border-border bg-surface/60 p-8")}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
