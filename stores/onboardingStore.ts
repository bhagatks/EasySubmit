import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RefineryFormValues } from "@/lib/resume/refineryDefaults";
import type { CountryCode, LocationOption } from "@/lib/locations";

export type JobTimeline =
  | "In a Rush"
  | "Planning Ahead"
  | "Just Exploring";

export type ExperienceLevel =
  | "Internship"
  | "Entry Level"
  | "Junior"
  | "Mid-level"
  | "Senior"
  | "Expert";

export const MAX_EXPERIENCE_SELECTIONS = 2;

export const TOTAL_ONBOARDING_STEPS = 11;

/** 1-based step numbers aligned with onboarding step components */
export const ONBOARDING_STEP = {
  TIMELINE: 1,
  LOCATIONS: 2,
  RESUME: 3,
  PARSING: 4,
  ANALYSIS_COMPLETE: 5,
  EXPERIENCE: 6,
  ROLES: 7,
  SALARY: 8,
  MATCHES: 9,
  SURVEY: 10,
  SOCIAL_PROOF: 11,
} as const;

export type OnboardingStep =
  (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];

export interface Location {
  id: string;
  name: string;
  /** Home base — primary address for generated resume; only one may be true */
  isResidential: boolean;
}

/** @deprecated Use `Location` */
export type TargetLocation = Location;

/** Returns the location flagged as home base, if any. */
export function getResidentialLocationFromStore(
  locations: Location[]
): Location | null {
  return locations.find((location) => location.isResidential) ?? null;
}

function toLocation(location: LocationOption): Location {
  return {
    id: location.id,
    name: location.city,
    isResidential: false,
  };
}

function skipResumePipelineStep(currentStep: OnboardingStep): OnboardingStep | null {
  if (currentStep === ONBOARDING_STEP.PARSING) {
    return ONBOARDING_STEP.EXPERIENCE;
  }
  return null;
}

interface OnboardingState extends OnboardingDataState {
  setJobTimeline: (timeline: JobTimeline) => void;
  setResumeFile: (file: File) => void;
  setResumeSkipped: (skipped: boolean) => void;
  setResumePreviewUrl: (url: string | null) => void;
  setParsedResumeData: (data: ParsedResumeData | null) => void;
  setFuelProcessed: (processed: boolean) => void;
  setRefineryDraft: (draft: RefineryFormValues | null) => void;
  setIsMapping: (mapping: boolean) => void;
  toggleExperienceLevel: (level: ExperienceLevel) => void;
  setSelectedRole: (role: string) => void;
  setMinSalary: (salary: number) => void;
  setWorkMode: (mode: string) => void;
  setReferralSource: (source: string) => void;
  toggleLocation: (location: LocationOption) => void;
  addTargetLocation: (location: Location) => void;
  removeTargetLocation: (id: string) => void;
  setResidential: (id: string) => void;
  setLocationsForCountry: (
    country: CountryCode,
    locations: LocationOption[],
    selected: boolean
  ) => void;
  isLocationSelected: (id: string) => boolean;
  getResidentialLocation: () => Location | null;
  completeResumeMapping: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetStore: () => void;
}

export type OnboardingDataState = {
  currentStep: OnboardingStep;
  jobTimeline: JobTimeline | null;
  targetLocations: Location[];
  resumeSkipped: boolean;
  isMapping: boolean;
  resumeFile: File | null;
  resumeFileName: string | null;
  resumePreviewUrl: string | null;
  parsedResumeData: ParsedResumeData | null;
  fuelProcessed: boolean;
  refineryDraft: RefineryFormValues | null;
  experienceLevels: ExperienceLevel[];
  selectedRole: string | null;
  minSalary: number;
  workMode: string | null;
  referralSource: string | null;
};

export type ParsedResumeData = {
  rawText: string;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  skills: string[];
};

export const INITIAL_ONBOARDING_STATE: OnboardingDataState = {
  currentStep: ONBOARDING_STEP.TIMELINE,
  jobTimeline: null,
  targetLocations: [],
  resumeSkipped: false,
  isMapping: false,
  resumeFile: null,
  resumeFileName: null,
  resumePreviewUrl: null,
  parsedResumeData: null,
  fuelProcessed: false,
  refineryDraft: null,
  experienceLevels: [],
  selectedRole: null,
  minSalary: 80,
  workMode: null,
  referralSource: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...INITIAL_ONBOARDING_STATE,

      resetStore: () => set(INITIAL_ONBOARDING_STATE),

      setJobTimeline: (timeline) => set({ jobTimeline: timeline }),

      setResumeFile: (file) =>
        set({
          resumeFile: file,
          resumeFileName: file.name,
          resumeSkipped: false,
          fuelProcessed: false,
          parsedResumeData: null,
        }),

      setResumeSkipped: (skipped) =>
        set({
          resumeSkipped: skipped,
          resumeFile: skipped ? null : get().resumeFile,
          resumeFileName: skipped ? null : get().resumeFileName,
          fuelProcessed: skipped ? false : get().fuelProcessed,
          parsedResumeData: skipped ? null : get().parsedResumeData,
          resumePreviewUrl: skipped ? null : get().resumePreviewUrl,
        }),

      setResumePreviewUrl: (url) => set({ resumePreviewUrl: url }),

      setParsedResumeData: (data) => set({ parsedResumeData: data }),

      setFuelProcessed: (processed) => set({ fuelProcessed: processed }),

      setRefineryDraft: (draft) => set({ refineryDraft: draft }),

      setIsMapping: (mapping) => set({ isMapping: mapping }),

      toggleExperienceLevel: (level) =>
        set((state) => {
          const exists = state.experienceLevels.includes(level);
          if (exists) {
            return {
              experienceLevels: state.experienceLevels.filter((l) => l !== level),
            };
          }
          if (state.experienceLevels.length >= MAX_EXPERIENCE_SELECTIONS) {
            return state;
          }
          return { experienceLevels: [...state.experienceLevels, level] };
        }),

      setSelectedRole: (role) => set({ selectedRole: role }),

      setMinSalary: (salary) => set({ minSalary: salary }),

      setWorkMode: (mode) => set({ workMode: mode }),

      setReferralSource: (source) => set({ referralSource: source }),

      toggleLocation: (location) =>
        set((state) => {
          const exists = state.targetLocations.some((l) => l.id === location.id);
          return {
            targetLocations: exists
              ? state.targetLocations.filter((l) => l.id !== location.id)
              : [...state.targetLocations, toLocation(location)],
          };
        }),

      addTargetLocation: (location) =>
        set((state) => {
          if (state.targetLocations.some((l) => l.id === location.id)) {
            return state;
          }
          const hasResidential = state.targetLocations.some((l) => l.isResidential);
          const isResidential = Boolean(location.isResidential) && !hasResidential;

          return {
            targetLocations: [
              ...state.targetLocations,
              {
                id: location.id,
                name: location.name,
                isResidential,
              },
            ],
          };
        }),

      removeTargetLocation: (id) =>
        set((state) => ({
          targetLocations: state.targetLocations.filter((l) => l.id !== id),
        })),

      setResidential: (id) =>
        set((state) => {
          if (!state.targetLocations.some((location) => location.id === id)) {
            return state;
          }
          return {
            targetLocations: state.targetLocations.map((location) => ({
              ...location,
              isResidential: location.id === id,
            })),
          };
        }),

      setLocationsForCountry: (_country, locations, selected) =>
        set((state) => {
          const countryIds = new Set(locations.map((location) => location.id));
          const withoutCountry = state.targetLocations.filter(
            (location) => !countryIds.has(location.id)
          );
          const added = selected ? locations.map(toLocation) : [];
          return {
            targetLocations: [...withoutCountry, ...added],
          };
        }),

      isLocationSelected: (id) =>
        get().targetLocations.some((location) => location.id === id),

      getResidentialLocation: () =>
        getResidentialLocationFromStore(get().targetLocations),

      completeResumeMapping: () =>
        set({
          isMapping: false,
          currentStep: ONBOARDING_STEP.EXPERIENCE,
        }),

      nextStep: () => {
        const { currentStep, resumeSkipped } = get();
        if (currentStep >= TOTAL_ONBOARDING_STEPS) return;

        if (resumeSkipped) {
          const skippedStep = skipResumePipelineStep(currentStep);
          if (skippedStep !== null) {
            set({ currentStep: skippedStep, isMapping: false });
            return;
          }
        }

        if (
          currentStep === ONBOARDING_STEP.PARSING ||
          currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE
        ) {
          set({ currentStep: ONBOARDING_STEP.EXPERIENCE, isMapping: false });
          return;
        }

        set({ currentStep: (currentStep + 1) as OnboardingStep });
      },

      prevStep: () => {
        const { currentStep, resumeSkipped, resumeFile } = get();
        if (currentStep <= ONBOARDING_STEP.TIMELINE) return;

        if (currentStep === ONBOARDING_STEP.EXPERIENCE && (resumeSkipped || resumeFile)) {
          set({ currentStep: ONBOARDING_STEP.RESUME, isMapping: false });
          return;
        }

        if (resumeSkipped) {
          if (currentStep === ONBOARDING_STEP.PARSING) {
            set({ currentStep: ONBOARDING_STEP.RESUME, isMapping: false });
            return;
          }
          if (currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE) {
            set({ currentStep: ONBOARDING_STEP.RESUME, isMapping: false });
            return;
          }
        }

        if (
          currentStep === ONBOARDING_STEP.PARSING ||
          currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE
        ) {
          set({ currentStep: ONBOARDING_STEP.RESUME, isMapping: false });
          return;
        }

        set({ currentStep: (currentStep - 1) as OnboardingStep });
      },
    }),
    {
      name: "easysubmit-onboarding",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          useOnboardingStore.getState().resetStore();
          return;
        }
        if (state.currentStep === ONBOARDING_STEP.PARSING) {
          state.currentStep = ONBOARDING_STEP.RESUME;
          state.isMapping = true;
        }
        if (state.currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE) {
          state.currentStep = ONBOARDING_STEP.EXPERIENCE;
          state.isMapping = false;
        }
        if (state.currentStep <= ONBOARDING_STEP.LOCATIONS) return;
        if (state.currentStep === ONBOARDING_STEP.RESUME) return;
        state.currentStep = (state.currentStep - 1) as OnboardingStep;
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        jobTimeline: state.jobTimeline,
        targetLocations: state.targetLocations,
        resumeSkipped: state.resumeSkipped,
        resumeFileName: state.resumeFileName,
        experienceLevels: state.experienceLevels,
        selectedRole: state.selectedRole,
        minSalary: state.minSalary,
        workMode: state.workMode,
        referralSource: state.referralSource,
      }),
    }
  )
);
