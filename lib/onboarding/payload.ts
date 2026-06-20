import type {
  ExperienceLevel,
  JobTimeline,
  Location,
} from "@/src/stores/onboarding-store";
import {
  getPrimaryAddress,
  getResidentialLocation,
} from "@/lib/onboarding/locations";

export interface OnboardingPayload {
  jobTimeline: JobTimeline | null;
  targetLocations: Location[];
  /** Home-base location (`isResidential: true`) for resume primary address */
  residentialLocation: Location | null;
  /** Convenience string for resume header / contact block */
  primaryAddress: string | null;
  experienceLevels: ExperienceLevel[];
  selectedRole: string | null;
  minSalary: number;
  referralSource: string | null;
  resumeFileName: string | null;
}

export function buildOnboardingPayload(input: {
  jobTimeline: JobTimeline | null;
  targetLocations: Location[];
  experienceLevels: ExperienceLevel[];
  selectedRole: string | null;
  minSalary: number;
  referralSource: string | null;
  resumeFile: File | null;
  resumeFileName: string | null;
}): OnboardingPayload {
  const residentialLocation = getResidentialLocation(input.targetLocations);

  return {
    jobTimeline: input.jobTimeline,
    targetLocations: input.targetLocations,
    residentialLocation,
    primaryAddress: getPrimaryAddress(input.targetLocations),
    experienceLevels: input.experienceLevels,
    selectedRole: input.selectedRole,
    minSalary: input.minSalary,
    referralSource: input.referralSource,
    resumeFileName:
      input.resumeFile?.name ?? input.resumeFileName ?? null,
  };
}

export function isOnboardingComplete(payload: OnboardingPayload): boolean {
  return Boolean(
    payload.jobTimeline &&
      payload.targetLocations.length > 0 &&
      payload.residentialLocation &&
      payload.experienceLevels.length > 0 &&
      payload.selectedRole &&
      payload.referralSource
  );
}
