"use client";

import CareerVisual from "@/components/onboarding/CareerVisual";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface VisualSectionProps {
  currentStep: number;
  className?: string;
}

export default function VisualSection({
  currentStep,
  className = "",
}: VisualSectionProps) {
  const resetStore = useOnboardingStore((s) => s.resetStore);

  return (
    <div
      className={`relative hidden min-h-screen bg-[#F1F5F9] lg:flex ${className}`}
    >
      <CareerVisual step={currentStep} />
      <button
        type="button"
        onClick={resetStore}
        className="absolute bottom-6 right-6 rounded-[12px] px-4 py-2 text-sm font-medium text-[#1F2937]/60 transition-all duration-200 ease-in-out hover:bg-white/80 hover:text-[#1F2937]"
      >
        Restart
      </button>
    </div>
  );
}
