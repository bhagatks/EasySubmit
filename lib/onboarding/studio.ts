import type { StudioState } from "@/stores/onboardingStore";

export const MIN_STUDIO_SKILLS = 6;

/** Studio phase can advance to synthesis when the skills requirement is met. Languages are optional. */
export function canProceedToCalibration(studio: StudioState): boolean {
  return studio.skills.length >= MIN_STUDIO_SKILLS;
}

export function selectCanProceedToCalibration(
  state: Pick<{ studio: StudioState }, "studio">,
): boolean {
  return canProceedToCalibration(state.studio);
}
