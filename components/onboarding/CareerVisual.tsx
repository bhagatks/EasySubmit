"use client";

import NavigatorSideVisual, {
  resolveNavigatorSideVisualState,
} from "@/components/onboarding/NavigatorSideVisual";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface CareerVisualProps {
  step: number;
  direction?: number;
}

export default function CareerVisual({ step, direction = 1 }: CareerVisualProps) {
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const state = resolveNavigatorSideVisualState(step, isMapping);

  return (
    <NavigatorSideVisual step={step} state={state} direction={direction} />
  );
}
