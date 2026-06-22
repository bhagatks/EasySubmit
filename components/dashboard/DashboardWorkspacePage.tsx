import type { ReactNode } from "react";
import { DASHBOARD_WORKSPACE_WIDTH_CLASS } from "@/lib/dashboard/dashboard-layout";
import { cn } from "@/lib/utils";

export { DASHBOARD_WORKSPACE_WIDTH_CLASS } from "@/lib/dashboard/dashboard-layout";

type DashboardWorkspaceShellProps = {
  children: ReactNode;
  className?: string;
};

/** Width-only shell — use when the page needs custom header spacing or layout. */
export function DashboardWorkspaceShell({ children, className }: DashboardWorkspaceShellProps) {
  return <div className={cn(DASHBOARD_WORKSPACE_WIDTH_CLASS, className)}>{children}</div>;
}

type DashboardWorkspacePageProps = {
  title: ReactNode;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Standard dashboard tab page layout: fixed 768px content column, title block, body.
 * Prefer this for new sidebar routes under `/dashboard/*`.
 */
export function DashboardWorkspacePage({
  title,
  description,
  aside,
  children,
  className,
}: DashboardWorkspacePageProps) {
  return (
    <DashboardWorkspaceShell className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </DashboardWorkspaceShell>
  );
}

type DashboardWorkspaceStackProps = {
  children: ReactNode;
  className?: string;
};

/** Collapsible section stack — consistent vertical rhythm across workspace pages. */
export function DashboardWorkspaceStack({ children, className }: DashboardWorkspaceStackProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
