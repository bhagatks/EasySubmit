"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PRICING_PLANS_GRID_CLASS,
  PricingPlanCardShell,
} from "@/components/pricing/PricingPlanCardShell";
import type { PricingDisplayPlan } from "@/lib/pricing/plan-display";
import {
  trackPricingCtaClicked,
  type PricingAnalyticsSurface,
} from "@/src/shared/analytics";
import type { ReactNode } from "react";

function resolvePricingSurface(pathname: string): PricingAnalyticsSurface {
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/select-plan") return "select_plan";
  return "landing";
}

function DefaultPlanAction({
  planId,
  comingSoon,
  cta,
  ctaHref,
  surface,
}: {
  planId: string;
  comingSoon?: boolean;
  cta: string;
  ctaHref: string;
  surface: PricingAnalyticsSurface;
}) {
  if (comingSoon) {
    return (
      <button
        disabled
        className="flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground"
      >
        Coming Soon
      </button>
    );
  }

  return (
    <Link
      href={ctaHref}
      onClick={() => trackPricingCtaClicked({ surface, planId, comingSoon: false })}
    >
      <Button
        className="h-11 w-full rounded-xl text-sm"
        variant={planId === "free" ? "mint" : "outline"}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}

type PricingPlansGridProps = {
  plans: PricingDisplayPlan[];
  renderAction?: (plan: PricingDisplayPlan) => ReactNode;
};

export function PricingPlansGrid({ plans, renderAction }: PricingPlansGridProps) {
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const pathname = usePathname();
  const pricingSurface = resolvePricingSurface(pathname);

  function toggleFeatures() {
    setFeaturesExpanded((open) => !open);
  }

  return (
    <div className={PRICING_PLANS_GRID_CLASS}>
      {plans.map((plan) => (
        <PricingPlanCardShell
          key={plan.id}
          plan={plan}
          featuresExpanded={featuresExpanded}
          onToggleFeatures={toggleFeatures}
          action={
            renderAction ? (
              renderAction(plan)
            ) : (
              <DefaultPlanAction
                planId={plan.id}
                comingSoon={plan.comingSoon}
                cta={plan.cta}
                ctaHref={plan.ctaHref}
                surface={pricingSurface}
              />
            )
          }
        />
      ))}
    </div>
  );
}
