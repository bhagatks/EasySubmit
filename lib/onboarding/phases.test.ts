import { describe, expect, it } from "vitest";
import { getMacroOnboardingPhase } from "@/lib/onboarding/phases";
import { ONBOARDING_STEP } from "@/src/stores/onboarding-store";

describe("getMacroOnboardingPhase", () => {
  it("maps early steps to profile phase", () => {
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.RESUME, false)).toBe(1);
  });

  it("maps experience steps to phase 2", () => {
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.ROLES, false)).toBe(2);
  });

  it("maps goals steps to phase 3", () => {
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.SALARY, false)).toBe(3);
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.SURVEY, false)).toBe(3);
  });

  it("maps mapping and parsing steps to phase 4", () => {
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.MATCHES, true)).toBe(4);
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.PARSING, false)).toBe(4);
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.ANALYSIS_COMPLETE, false)).toBe(4);
    expect(getMacroOnboardingPhase(ONBOARDING_STEP.SOCIAL_PROOF, false)).toBe(4);
  });
});
