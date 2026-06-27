"use client";

import { ChevronDown, GripVertical } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StudioCollapsibleSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  showDragHandle?: boolean;
  hasError?: boolean;
};

export function StudioCollapsibleSection({
  title,
  description,
  expanded,
  onToggle,
  children,
  variant = "onboarding",
  monoClass,
  showDragHandle = true,
  hasError = false,
}: StudioCollapsibleSectionProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isOnboarding
          ? "border-white/10 bg-white/[0.02]"
          : "border-border bg-surface",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-3 text-left transition-colors",
          isOnboarding ? "hover:bg-white/[0.04]" : "hover:bg-muted/40",
        )}
        aria-expanded={expanded}
      >
        {showDragHandle ? (
          <GripVertical
            className={cn(
              "h-4 w-4 shrink-0",
              isOnboarding ? "text-[oklch(0.45_0.02_268)]" : "text-muted-foreground/60",
            )}
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              monoClass,
              "inline-flex items-center text-sm font-semibold",
              isOnboarding ? "text-[oklch(0.98_0.01_268)]" : "text-foreground",
            )}
          >
            {title}
            {hasError ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.22_25)]" />
            ) : null}
          </span>
          {description ? (
            <span
              className={cn(
                "mt-0.5 block text-xs",
                isOnboarding ? "text-[oklch(0.65_0.02_268)]" : "text-muted-foreground",
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            expanded && "rotate-180",
            isOnboarding ? "text-[oklch(0.65_0.02_268)]" : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
      </button>
      {expanded ? (
        <div
          className={cn(
            "border-t px-4 pb-4 pt-3",
            isOnboarding ? "border-white/10" : "border-border",
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
