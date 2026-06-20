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

/** Sections expanded by default during onboarding (mandatory gates). */
export const STUDIO_MANDATORY_SECTIONS: StudioEditorSectionId[] = ["header", "skills"];

export function defaultStudioSectionExpanded(
  sectionId: StudioEditorSectionId,
  variant: "onboarding" | "dashboard",
): boolean {
  if (variant === "dashboard") return false;
  return STUDIO_MANDATORY_SECTIONS.includes(sectionId);
}

export function buildInitialStudioSectionState(
  sectionIds: StudioEditorSectionId[],
  variant: "onboarding" | "dashboard",
): Record<string, boolean> {
  return Object.fromEntries(
    sectionIds.map((id) => [id, defaultStudioSectionExpanded(id, variant)]),
  );
}
