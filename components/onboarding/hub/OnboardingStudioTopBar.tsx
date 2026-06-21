"use client";

import { EnhanceWithAiButton } from "@/components/resume/EnhanceWithAiFlow";
import { cn } from "@/lib/utils";

type OnboardingStudioTopBarProps = {
  onEnhanceClick: () => void;
  isEnhancing?: boolean;
  showEnhanceButton?: boolean;
  className?: string;
};

/** Phase 3 onboarding — mirrors dashboard studio header (Studio | Enhance | right slot). */
export function OnboardingStudioTopBar({
  onEnhanceClick,
  isEnhancing = false,
  showEnhanceButton = false,
  className,
}: OnboardingStudioTopBarProps) {
  return (
    <header
      className={cn(
        "grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 px-4",
        className,
      )}
    >
      <div className="text-sm text-[oklch(0.75_0.02_268)] justify-self-start">Studio</div>
      <div className="justify-self-center">
        {showEnhanceButton ? (
          <EnhanceWithAiButton
            variant="onboarding"
            isLoading={isEnhancing}
            onClick={onEnhanceClick}
          />
        ) : null}
      </div>
      <div className="justify-self-end font-display text-xs font-semibold tracking-tight text-foreground">
        easysubmit<span className="text-mint"> AI</span>
      </div>
    </header>
  );
}
