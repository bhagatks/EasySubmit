import { buildPricingDisplayPlans, PRICING_PAGE_COPY } from "@/lib/pricing/plan-display";
import { getAppConfig } from "@/src/lib/services/config-service";
import { SelectPlanClient } from "./SelectPlanClient";

export const dynamic = "force-dynamic";

export default async function SelectPlanPage() {
  const subscriptions = await getAppConfig("subscriptions");
  const plans = buildPricingDisplayPlans(subscriptions);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="relative overflow-hidden pb-10 pt-4 md:pt-5">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute -top-10 left-1/2 h-40 w-[60%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center md:mb-12">
            <p className="text-xs text-muted-foreground mb-1.5">Get started</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Choose your plan
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {PRICING_PAGE_COPY.subhead}
            </p>
          </div>

          <SelectPlanClient plans={plans} />

          <div className="mt-8 space-y-1 text-center text-xs text-muted-foreground">
            <p>{PRICING_PAGE_COPY.footerDailyLimit}</p>
            <p>{PRICING_PAGE_COPY.footerPaidComingSoon}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
