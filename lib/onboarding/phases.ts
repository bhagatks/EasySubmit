import { ONBOARDING_STEP } from "@/src/stores/onboarding-store";

export const ONBOARDING_PHASES = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Goals" },
  { id: 4, label: "AI Mapping" },
] as const;

export type OnboardingPhaseId = (typeof ONBOARDING_PHASES)[number]["id"];

/** Maps the wizard micro-step to one of four macro onboarding phases. */
export function getMacroOnboardingPhase(
  currentStep: number,
  isMapping: boolean
): OnboardingPhaseId {
  if (
    isMapping ||
    currentStep === ONBOARDING_STEP.PARSING ||
    currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE ||
    currentStep === ONBOARDING_STEP.SOCIAL_PROOF
  ) {
    return 4;
  }

  if (currentStep <= ONBOARDING_STEP.RESUME) {
    return 1;
  }

  if (currentStep <= ONBOARDING_STEP.ROLES) {
    return 2;
  }

  return 3;
}
