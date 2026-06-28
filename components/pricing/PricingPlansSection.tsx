import { PricingPlansGrid } from "@/components/pricing/PricingPlansGrid";
import {
  buildPricingDisplayPlans,
  PRICING_FAQ,
  PRICING_PAGE_COPY,
} from "@/lib/pricing/plan-display";
import { getAppConfig } from "@/src/lib/services/config-service";
import { cn } from "@/lib/utils";

type PricingPlansSectionProps = {
  showFaq?: boolean;
  className?: string;
  id?: string;
};

export async function PricingPlansSection({
  showFaq = false,
  className,
  id,
}: PricingPlansSectionProps) {
  const subscriptions = await getAppConfig("subscriptions");
  const plans = buildPricingDisplayPlans(subscriptions);

  return (
    <>
      <section
        id={id}
        className={cn("relative overflow-hidden py-16 md:py-20", className)}
      >
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute -top-10 left-1/2 h-40 w-[60%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center md:mb-12">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              {PRICING_PAGE_COPY.title}{" "}
              <span className="text-gradient">{PRICING_PAGE_COPY.titleAccent}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {PRICING_PAGE_COPY.subhead}
            </p>
          </div>

          <PricingPlansGrid plans={plans} />

          <div className="mt-8 space-y-1 text-center text-xs text-muted-foreground">
            <p>{PRICING_PAGE_COPY.footerDailyLimit}</p>
            <p>{PRICING_PAGE_COPY.footerPaidComingSoon}</p>
          </div>
        </div>
      </section>

      {showFaq && (
        <section className="border-t border-border/60 py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-center mb-8">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {PRICING_FAQ.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-border bg-surface/60 p-5">
                  <p className="font-medium text-foreground">{q}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
