"use client";

import CareerVisual from "@/components/onboarding/CareerVisual";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface VisualSectionProps {
  currentStep: number;
  direction?: number;
}

export default function VisualSection({
  currentStep,
  direction = 1,
}: VisualSectionProps) {
  const resetStore = useOnboardingStore((s) => s.resetStore);

  return (
    <div className="relative flex h-full min-h-[320px] flex-1 flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-muted">
      <CareerVisual step={currentStep} direction={direction} />
      <button
        type="button"
        onClick={resetStore}
        className="absolute bottom-6 right-6 rounded-[12px] px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-white/80 hover:text-foreground"
      >
        Restart
      </button>
    </div>
  );
}
