import type {
  ExperienceLevel,
  JobTimeline,
  Location,
} from "@/stores/onboardingStore";

export interface OnboardingPayload {
  jobTimeline: JobTimeline | null;
  targetLocations: Location[];
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
  return {
    jobTimeline: input.jobTimeline,
    targetLocations: input.targetLocations,
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
      payload.experienceLevels.length > 0 &&
      payload.selectedRole &&
      payload.referralSource
  );
}
