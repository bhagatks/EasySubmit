import { cn } from "@/lib/utils";

/** Fixed top chrome height — sidebar brand row and workspace header must match. */
export const DASHBOARD_TOPBAR_HEIGHT_CLASS = "h-14";

export const DASHBOARD_TOPBAR_BORDER_CLASS = "border-b border-border/60";

export function dashboardTopBarClassName(className?: string): string {
  return cn(DASHBOARD_TOPBAR_HEIGHT_CLASS, DASHBOARD_TOPBAR_BORDER_CLASS, className);
}

/** Shared height/padding for dashboard header actions (Save, BYOK, sign out). */
export const dashboardHeaderControlClassName =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all duration-300";

export const dashboardHeaderMintPillStyle = {
  color: "oklch(0.82 0.16 165)",
  borderColor: "oklch(0.82 0.16 165 / 0.4)",
  backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
} as const;

export const dashboardHeaderWarningPillStyle = {
  color: "oklch(0.55 0.22 25)",
  borderColor: "oklch(0.55 0.22 25 / 0.45)",
  backgroundColor: "oklch(0.55 0.22 25 / 0.1)",
} as const;

export function dashboardHeaderMintPillClassName(className?: string): string {
  return cn(dashboardHeaderControlClassName, "border hover:brightness-110", className);
}

export function dashboardHeaderWarningPillClassName(className?: string): string {
  return cn(dashboardHeaderControlClassName, "border hover:brightness-110", className);
}

export const dashboardHeaderNeutralPillStyle = {
  color: "oklch(0.98 0.01 268)",
  borderColor: "oklch(0.98 0.01 268 / 0.35)",
  backgroundColor: "oklch(0.98 0.01 268 / 0.06)",
} as const;

export function dashboardHeaderNeutralPillClassName(className?: string): string {
  return cn(dashboardHeaderControlClassName, "border hover:brightness-110", className);
}
