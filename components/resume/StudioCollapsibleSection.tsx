"use client";

import { ChevronDown, GripVertical } from "lucide-react";
import { type ReactNode } from "react";
import { STUDIO_SECTION_ERROR_CLASS } from "@/lib/resume/studio-field-styles";
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
  showChevron?: boolean;
  hasError?: boolean;
  /** Icons or links rendered on the header row (clicks do not toggle expand). */
  headerActions?: ReactNode;
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
  showChevron = true,
  hasError = false,
  headerActions,
}: StudioCollapsibleSectionProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        hasError
          ? STUDIO_SECTION_ERROR_CLASS
          : isOnboarding
            ? "border-white/10 bg-white/[0.02]"
            : "border-border bg-surface",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-3",
          isOnboarding ? "hover:bg-white/[0.04]" : "hover:bg-muted/40",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors"
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
        </button>
        {headerActions ? (
          <span className="flex shrink-0 items-center">{headerActions}</span>
        ) : null}
        {showChevron ? (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-lg p-1 transition-colors"
            aria-label={expanded ? "Collapse section" : "Expand section"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
                isOnboarding ? "text-[oklch(0.65_0.02_268)]" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
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
