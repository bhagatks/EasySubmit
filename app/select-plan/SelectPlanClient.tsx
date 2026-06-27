"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectPlan } from "@/app/actions/select-plan";
import { cn } from "@/lib/utils";

export type SelectPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlight: boolean;
  description: string;
  tiers: { label: string; detail: string }[];
  features: string[];
};

function PlanCard({
  plan,
  onSelect,
  pending,
}: {
  plan: SelectPlan;
  onSelect: () => void;
  pending: boolean;
}) {
  const isFree = plan.id === "free";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-4 transition",
        plan.highlight
          ? "border-primary/60 bg-surface shadow-glow"
          : isFree
            ? "border-mint/40 bg-surface/80"
            : "border-border bg-surface/60",
      )}
    >
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            plan.highlight ? "bg-mint text-mint-foreground" : "bg-primary/20 text-primary",
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
              isFree
                ? "bg-mint/10 border border-mint/20"
                : "bg-primary/10 border border-primary/20",
            )}
          >
            <span className={cn("font-semibold", isFree ? "text-mint" : "text-primary")}>
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
                isFree ? "text-mint" : "text-primary",
              )}
            />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isFree ? (
          <Button
            className="w-full"
            variant="mint"
            onClick={onSelect}
            disabled={pending}
          >
            {pending ? "Continuing…" : "Start for Free"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/40 py-2.5 text-sm text-muted-foreground"
          >
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );
}

export function SelectPlanClient({ plans }: { plans: SelectPlan[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();

  async function handleSelectFree() {
    setPending(true);
    setError(null);
    const result = await selectPlan("free");
    if (!result.success) {
      setError("Something went wrong. Please try again.");
      setPending(false);
      return;
    }
    await update({ planConfirmedAt: new Date().toISOString() });
    router.replace("/onboarding");
  }

  return (
    <>
      {error && (
        <p className="mb-4 text-center text-sm text-destructive">{error}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelectFree}
            pending={pending}
          />
        ))}
      </div>
    </>
  );
}
