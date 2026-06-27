"use client";

import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { cn } from "@/lib/utils";

type OnboardingStudioTopBarProps = {
  className?: string;
};

/** Phase 3 onboarding — mirrors dashboard studio header (Studio | right slot). */
export function OnboardingStudioTopBar({ className }: OnboardingStudioTopBarProps) {
  return (
    <header
      className={cn(
        "grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 px-4",
        className,
      )}
    >
      <div className="text-sm text-[oklch(0.75_0.02_268)] justify-self-start">Studio</div>
      <div className="justify-self-center" />
      <div className="justify-self-end">
        <BrandWordmark
          className="text-xs"
          nameClassName="text-foreground"
          suffixClassName="text-mint"
        />
      </div>
    </header>
  );
}
