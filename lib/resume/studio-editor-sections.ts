import { RESUME_SECTION_TITLES } from "@/lib/resume/resumeSpec";

/** Collapsible editor sections — mirrors ATS order (header first). */
export type StudioEditorSectionId =
  | "profileRole"
  | "header"
  | "professionalSummary"
  | "skills"
  | "professionalExperience"
  | "education"
  | "certifications"
  | "projects"
  | "languages";

export const STUDIO_EDITOR_SECTION_LABELS: Record<StudioEditorSectionId, string> = {
  profileRole: "Profile role",
  header: "Resume Header",
  professionalSummary: RESUME_SECTION_TITLES.professionalSummary,
  skills: RESUME_SECTION_TITLES.skills,
  professionalExperience: RESUME_SECTION_TITLES.professionalExperience,
  education: RESUME_SECTION_TITLES.education,
  certifications: RESUME_SECTION_TITLES.certifications,
  projects: RESUME_SECTION_TITLES.projects,
  languages: RESUME_SECTION_TITLES.languages,
};

/** Sections expanded by default during onboarding (required for finalize). */
export const STUDIO_MANDATORY_SECTIONS: StudioEditorSectionId[] = [
  "header",
  "skills",
  "professionalExperience",
];

export const ONBOARDING_STUDIO_SECTION_IDS: StudioEditorSectionId[] = [
  "header",
  "professionalSummary",
  "skills",
  "professionalExperience",
  "education",
  "certifications",
  "projects",
  "languages",
];

/** Resume profile Studio — profile role + same mandatory blocks as onboarding. */
export const PROFILE_MANDATORY_SECTIONS: StudioEditorSectionId[] = [
  "profileRole",
  ...STUDIO_MANDATORY_SECTIONS,
];

export const PROFILE_STUDIO_SECTION_IDS: StudioEditorSectionId[] = [
  "profileRole",
  ...ONBOARDING_STUDIO_SECTION_IDS,
];

export type StudioEditorVariant = "onboarding" | "dashboard" | "profile";

export function defaultStudioSectionExpanded(
  sectionId: StudioEditorSectionId,
  variant: StudioEditorVariant,
): boolean {
  if (variant === "dashboard") return false;
  if (variant === "profile") {
    return PROFILE_MANDATORY_SECTIONS.includes(sectionId);
  }
  return STUDIO_MANDATORY_SECTIONS.includes(sectionId);
}

export function buildInitialStudioSectionState(
  sectionIds: StudioEditorSectionId[],
  variant: StudioEditorVariant,
): Record<string, boolean> {
  return Object.fromEntries(
    sectionIds.map((id) => [id, defaultStudioSectionExpanded(id, variant)]),
  );
}

/** Mandatory onboarding Studio sections expanded — Import → Studio (upload or manual). */
export function buildOnboardingStudioSectionExpansion(): Record<string, boolean> {
  return buildInitialStudioSectionState(ONBOARDING_STUDIO_SECTION_IDS, "onboarding");
}

/** Mandatory resume profile Studio sections expanded — new profile (blank, copy, or upload). */
export function buildProfileStudioSectionExpansion(): Record<string, boolean> {
  return buildInitialStudioSectionState(PROFILE_STUDIO_SECTION_IDS, "profile");
}
