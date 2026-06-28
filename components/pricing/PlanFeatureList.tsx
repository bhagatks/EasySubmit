"use client";

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanFeaturesProps = {
  features: string[];
  accent: "mint" | "primary";
};

export function PlanFeatures({ features, accent }: PlanFeaturesProps) {
  return (
    <ul className="space-y-2">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug">
          <Check
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              accent === "mint" ? "text-mint" : "text-primary",
            )}
          />
          <span className="text-foreground/90">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

type PlanFeatureExpandButtonProps = {
  expanded: boolean;
  totalCount: number;
  accent: "mint" | "primary";
  onToggle: () => void;
};

export function PlanFeatureExpandButton({
  expanded,
  totalCount,
  accent,
  onToggle,
}: PlanFeatureExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-5 items-center gap-1 text-xs font-medium transition hover:opacity-80",
        accent === "mint" ? "text-mint" : "text-primary",
      )}
    >
      {expanded ? "Show less" : `All features (${totalCount})`}
      <ChevronDown
        className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
      />
    </button>
  );
}
