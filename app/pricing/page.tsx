import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { brandCopyright, BRAND } from "@/lib/brand";
import { LogoIcon } from "@/components/ui/logo";
import { getAppConfig } from "@/src/lib/services/config-service";
import type { SubscriptionConfig } from "@/src/lib/services/subscription-config";
import { cn } from "@/lib/utils";

export const metadata = {
  title: `Pricing — ${BRAND.full}`,
  description: "Free with your own AI key. Subscribe for system AI credits.",
};

export const dynamic = "force-dynamic";

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlight?: boolean;
  comingSoon?: boolean;
  description: string;
  tiers: { label: string; detail: string }[];
  features: string[];
  cta: string;
  ctaHref: string;
};

function formatPrice(price: number): string {
  return `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}

function buildPlans(
  systemDailyEnhancements: number,
  byokDailyEnhancements: number,
  sub: SubscriptionConfig,
): Plan[] {
  const live = sub.enabled;
  const { weekly, monthly, yearly } = sub.plans;

  const monthlySavings = Math.round((weekly.price * 4 - monthly.price) * 100) / 100;
  const yearlySavings = Math.round((monthly.price * 12 - yearly.price) * 100) / 100;

  return [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Start instantly — no card required.",
      tiers: [
        {
          label: "No key",
          detail: `${systemDailyEnhancements} resumes / day`,
        },
        {
          label: "With your key",
          detail: `${byokDailyEnhancements} resumes / day`,
        },
      ],
      features: [
        "Full ATS scoring + keyword gap",
        "Job tracker",
        "Chrome extension autofill",
        "PDF + DOCX export",
        "1 resume profile",
      ],
      cta: "Start for Free",
      ctaHref: "/login",
    },
    {
      id: "weekly",
      name: "Weekly",
      price: formatPrice(weekly.price),
      period: "/ week",
      description: "More system AI credits for active job seekers.",
      comingSoon: !live,
      tiers: [
        { label: "System AI", detail: `${weekly.dailyEnhancements} resumes / day` },
      ],
      features: [
        "Everything in Free",
        "Priority AI queue",
        "Unlimited job tracker",
        "Multiple resume profiles",
      ],
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
    {
      id: "monthly",
      name: "Monthly",
      price: formatPrice(monthly.price),
      period: "/ month",
      highlight: true,
      badge: "Most Popular",
      description: "Best value for a full job search cycle.",
      comingSoon: !live,
      tiers: [
        { label: "System AI", detail: `${monthly.dailyEnhancements} resumes / day` },
      ],
      features: [
        "Everything in Weekly",
        `Saves ~$${monthlySavings} vs weekly`,
      ],
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
    {
      id: "yearly",
      name: "Yearly",
      price: formatPrice(yearly.price),
      period: "/ year",
      badge: "Best Value",
      description: "Committed to landing your next role.",
      comingSoon: !live,
      tiers: [
        { label: "System AI", detail: `${yearly.dailyEnhancements} resumes / day` },
      ],
      features: [
        "Everything in Monthly",
        `~$${(yearly.price / 12).toFixed(2)}/mo — saves $${yearlySavings} vs monthly`,
        "Early access to new features",
      ],
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
  ];
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition",
        plan.highlight
          ? "border-primary/60 bg-surface shadow-glow"
          : plan.id === "free"
            ? "border-mint/40 bg-surface/80"
            : "border-border bg-surface/60",
      )}
    >
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            plan.highlight
              ? "bg-mint text-mint-foreground"
              : "bg-primary/20 text-primary",
          )}
        >
          {plan.badge}
        </span>
      )}

      <div>
        <p className="text-xs text-muted-foreground">{plan.name}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-semibold">{plan.price}</span>
          <span className="text-xs text-muted-foreground">{plan.period}</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

      <div className="mt-4 space-y-2">
        {plan.tiers.map((t) => (
          <div
            key={t.label}
            className={cn(
              "rounded-lg px-3 py-2 text-xs",
              plan.id === "free"
                ? "bg-mint/10 border border-mint/20"
                : "bg-primary/10 border border-primary/20",
            )}
          >
            <span
              className={cn(
                "font-semibold",
                plan.id === "free" ? "text-mint" : "text-primary",
              )}
            >
              {t.label}
            </span>
            <span className="text-muted-foreground"> — {t.detail}</span>
          </div>
        ))}
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                plan.id === "free" ? "text-mint" : "text-primary",
              )}
            />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {plan.comingSoon ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/40 py-2.5 text-sm text-muted-foreground"
          >
            Coming Soon
          </button>
        ) : (
          <Link href={plan.ctaHref}>
            <Button
              className="w-full"
              variant={plan.id === "free" ? "mint" : plan.highlight ? "hero" : "outline"}
            >
              {plan.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function PricingPage() {
  const [aiEngine, subscriptions] = await Promise.all([
    getAppConfig("aiEngine"),
    getAppConfig("subscriptions"),
  ]);

  const plans = buildPlans(
    aiEngine.quotas.system.dailyEnhancements,
    aiEngine.customerDailyEnhancementCap,
    subscriptions,
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-border/60 py-20">
          <div className="bg-grid absolute inset-0 opacity-40" />
          <div className="absolute -top-20 left-1/2 h-60 w-[60%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Simple pricing
            </div>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight md:text-6xl">
              Free with your key.{" "}
              <span className="text-gradient">Pay for ours.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Bring your own AI key and everything is free forever. Or subscribe
              to use our system AI with a daily credit allowance.
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Daily limits reset at midnight UTC. Subscriptions unlock higher system AI quotas.
            </p>
          </div>
        </section>

        <section className="border-t border-border/60 py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-center mb-8">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What counts as an AI enhance?",
                  a: "Each time you run AI to tailor your resume to a job description counts as one enhancement. Scoring, keyword gap analysis, and ATS checks do not count.",
                },
                {
                  q: "What is BYOK?",
                  a: "Bring Your Own Key — connect your own OpenAI, Anthropic, Gemini, or Groq API key. Your key pays the AI provider directly (cents per resume), and you get unlimited enhancements for free.",
                },
                {
                  q: "Do daily limits reset?",
                  a: "Yes, system AI credits reset at midnight UTC every day.",
                },
                {
                  q: "Can I switch plans?",
                  a: "Yes — upgrade, downgrade, or cancel anytime. Add your own AI key and get unlimited usage at no cost regardless of your plan.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-border bg-surface/60 p-5">
                  <p className="font-medium text-foreground">{q}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span>{brandCopyright(new Date().getFullYear())}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
