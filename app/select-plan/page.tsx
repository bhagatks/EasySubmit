import { getAppConfig } from "@/src/lib/services/config-service";
import { SelectPlanClient } from "./SelectPlanClient";

export const dynamic = "force-dynamic";

export default async function SelectPlanPage() {
  const [aiEngine, subscriptions] = await Promise.all([
    getAppConfig("aiEngine"),
    getAppConfig("subscriptions"),
  ]);

  const { weekly, monthly, yearly } = subscriptions.plans;

  function fmt(price: number) {
    return `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
  }

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      badge: undefined as string | undefined,
      highlight: false,
      description: "Start instantly — no card required.",
      tiers: [
        { label: "No key", detail: `${aiEngine.quotas.system.dailyEnhancements} resumes / day` },
        { label: "With your key", detail: `${aiEngine.customerDailyEnhancementCap} resumes / day` },
      ],
      features: [
        "Full ATS scoring + keyword gap",
        "Job tracker",
        "Chrome extension autofill",
        "PDF + DOCX export",
        "1 resume profile",
      ],
    },
    {
      id: "weekly",
      name: "Weekly",
      price: fmt(weekly.price),
      period: "/ week",
      badge: undefined as string | undefined,
      highlight: false,
      description: "More system AI credits for active job seekers.",
      tiers: [{ label: "System AI", detail: `${weekly.dailyEnhancements} resumes / day` }],
      features: [
        "Everything in Free",
        "Priority AI queue",
        "Unlimited job tracker",
        "Multiple resume profiles",
      ],
    },
    {
      id: "monthly",
      name: "Monthly",
      price: fmt(monthly.price),
      period: "/ month",
      badge: "Most Popular",
      highlight: true,
      description: "Best value for a full job search cycle.",
      tiers: [{ label: "System AI", detail: `${monthly.dailyEnhancements} resumes / day` }],
      features: ["Everything in Weekly", `Saves ~$${Math.round((weekly.price * 4 - monthly.price) * 100) / 100} vs weekly`],
    },
    {
      id: "yearly",
      name: "Yearly",
      price: fmt(yearly.price),
      period: "/ year",
      badge: "Best Value",
      highlight: false,
      description: "Committed to landing your next role.",
      tiers: [{ label: "System AI", detail: `${yearly.dailyEnhancements} resumes / day` }],
      features: [
        "Everything in Monthly",
        `~$${(yearly.price / 12).toFixed(2)}/mo`,
        "Early access to new features",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="relative overflow-hidden py-10">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute -top-10 left-1/2 h-40 w-[60%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-8 text-center">
            <p className="text-xs text-muted-foreground mb-1.5">Get started</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Choose your plan
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Start free — bring your own AI key for unlimited usage, or subscribe for system AI credits.
            </p>
          </div>

          <SelectPlanClient plans={plans} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Daily limits reset at midnight UTC. You can upgrade anytime from your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
