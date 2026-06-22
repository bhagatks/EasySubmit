"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StudioPanelTab = "editor" | "layout";

type StudioPanelTabsProps = {
  activeTab: StudioPanelTab;
  onTabChange: (tab: StudioPanelTab) => void;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  actions?: ReactNode;
};

export function StudioPanelTabs({
  activeTab,
  onTabChange,
  variant = "dashboard",
  monoClass,
  actions,
}: StudioPanelTabsProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <div
      className={cn(
        "flex shrink-0 items-stretch border-b",
        isOnboarding ? "border-white/10 bg-[oklch(0.14_0.04_268)]" : "border-border bg-surface",
      )}
    >
      <div className="flex min-w-0 flex-1" role="tablist" aria-label="Studio panel">
      {(
        [
          { id: "editor" as const, label: "Editor" },
          { id: "layout" as const, label: "Layout" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            monoClass,
            "flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
            activeTab === tab.id
              ? isOnboarding
                ? "border-b-2 border-[oklch(0.62_0.21_265)] text-[oklch(0.98_0.01_268)]"
                : "border-b-2 border-mint text-foreground"
              : isOnboarding
                ? "text-[oklch(0.55_0.02_268)] hover:text-[oklch(0.85_0.02_268)]"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1 border-l border-border px-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type { StudioPanelTab };
