import type { ReactNode } from "react";
import type { PricingDisplayPlan } from "@/lib/pricing/plan-display";
import {
  PlanFeatureExpandButton,
  PlanFeatures,
} from "@/components/pricing/PlanFeatureList";
import { cn } from "@/lib/utils";

/** Parent grid row tracks — cards use `grid-rows-subgrid` to align each row across columns. */
export const PRICING_PLANS_GRID_CLASS =
  "grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto_auto_minmax(12rem,auto)_auto]";

type PricingPlanCardShellProps = {
  plan: PricingDisplayPlan;
  action: ReactNode;
  featuresExpanded: boolean;
  onToggleFeatures: () => void;
};

export function PricingPlanCardShell({
  plan,
  action,
  featuresExpanded,
  onToggleFeatures,
}: PricingPlanCardShellProps) {
  const isFree = plan.id === "free";
  const isPopular = plan.badge === "Most Popular";
  const accent = isFree ? "mint" : "primary";
  const shown = featuresExpanded ? plan.allFeatures : plan.visibleFeatures;

  return (
    <div
      className={cn(
        "relative grid h-full gap-4 rounded-2xl border p-5 md:p-6 lg:grid-rows-subgrid lg:row-span-6",
        isFree && "border-mint/40 bg-surface/80",
        !isFree && isPopular && "border-primary/40 bg-surface/70",
        !isFree && !isPopular && "border-border bg-surface/60",
      )}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary/20 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {plan.badge}
        </span>
      )}

      {/* Row 1 — plan name */}
      <p className="text-sm text-muted-foreground">{plan.name}</p>

      {/* Row 2 — price + period + savings */}
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-3xl font-semibold leading-none tracking-tight">
            {plan.price}
          </span>
          <span className="text-sm text-muted-foreground">{plan.period}</span>
          {plan.id === "monthly" && plan.savingsNote ? (
            <span className="text-xs font-medium text-primary">{plan.savingsNote}</span>
          ) : null}
        </div>
        {plan.id === "yearly" && plan.savingsNote ? (
          <p className="mt-1 text-xs font-medium text-primary">{plan.savingsNote}</p>
        ) : null}
      </div>

      {/* Row 3 — description */}
      <p className="text-sm leading-snug text-muted-foreground">{plan.description}</p>

      {/* Row 4 — tier pill */}
      <div>
        {plan.tiers.map((t) => (
          <div
            key={t.label}
            className={cn(
              "rounded-xl px-3 py-2.5 text-xs leading-snug",
              isFree
                ? "border border-mint/20 bg-mint/10"
                : "border border-primary/20 bg-primary/10",
            )}
          >
            <span className={cn("font-semibold", isFree ? "text-mint" : "text-primary")}>
              {t.label}
            </span>
            <span className="text-muted-foreground"> — {t.detail}</span>
          </div>
        ))}
      </div>

      {/* Row 5 — feature list (shared row height via subgrid) */}
      <div className="min-h-0 self-start">
        <PlanFeatures features={shown} accent={accent} />
      </div>

      {/* Row 6 — expand + CTA (fixed internal gap) */}
      <div className="flex flex-col gap-6 self-start">
        <PlanFeatureExpandButton
          expanded={featuresExpanded}
          totalCount={plan.allFeatures.length}
          accent={accent}
          onToggle={onToggleFeatures}
        />
        <div className="w-full">{action}</div>
      </div>
    </div>
  );
}
