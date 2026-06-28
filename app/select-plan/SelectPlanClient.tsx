"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingPlansGrid } from "@/components/pricing/PricingPlansGrid";
import { selectPlan } from "@/app/actions/select-plan";
import { trackPlanSelected, trackPricingCtaClicked } from "@/src/shared/analytics";
import type { PricingDisplayPlan } from "@/lib/pricing/plan-display";

export function SelectPlanClient({ plans }: { plans: PricingDisplayPlan[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();

  async function handleSelectFree() {
    setPending(true);
    setError(null);
    trackPricingCtaClicked({ surface: "select_plan", planId: "free" });
    const result = await selectPlan("free");
    if (!result.success) {
      setError("Something went wrong. Please try again.");
      setPending(false);
      return;
    }
    trackPlanSelected({ planId: "free", surface: "select_plan" });
    await update({ planConfirmedAt: new Date().toISOString() });
    router.replace("/onboarding");
  }

  return (
    <>
      {error && (
        <p className="mb-4 text-center text-sm text-destructive">{error}</p>
      )}
      <PricingPlansGrid
        plans={plans}
        renderAction={(plan) =>
          plan.id === "free" ? (
            <Button
              className="h-11 w-full rounded-xl text-sm"
              variant="mint"
              onClick={handleSelectFree}
              disabled={pending}
            >
              {pending ? "Continuing…" : "Start for Free"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <button
              disabled
              className="flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground"
            >
              Coming Soon
            </button>
          )
        }
      />
    </>
  );
}
