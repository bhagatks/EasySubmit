"use client";

import NavigatorSideVisual, {
  resolveNavigatorSideVisualState,
} from "@/components/onboarding/NavigatorSideVisual";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface CareerVisualProps {
  step: number;
}

export default function CareerVisual({ step }: CareerVisualProps) {
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const state = resolveNavigatorSideVisualState(step, isMapping);

  return <NavigatorSideVisual state={state} />;
}
