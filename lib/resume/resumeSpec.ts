/**
 * Canonical resume formatting constants.
 * Rules document: EASYSUBMIT_RESUME_RULES.md (repository root)
 * Golden fixtures: ATS_Universal_Resume_Template.pdf / .docx (repository root)
 */

export const RESUME_RULES_FILENAME = "EASYSUBMIT_RESUME_RULES.md";
export const ATS_TEMPLATE_PDF_FILENAME = "ATS_Universal_Resume_Template.pdf";
export const ATS_TEMPLATE_DOCX_FILENAME = "ATS_Universal_Resume_Template.docx";
export const BHAGATH_SAMPLE_PDF_FILENAME = "ATS_Bhagath_Sample.pdf";

/** Fixed ATS section order — see EASYSUBMIT_RESUME_RULES.md §3. */
export const RESUME_SECTION_ORDER = [
  "header",
  "professionalSummary",
  "skills",
  "professionalExperience",
  "education",
  "certifications",
  "projects",
  "languages",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_ORDER)[number];

export const RESUME_SECTION_TITLES: Record<
  Exclude<ResumeSectionKey, "header">,
  string
> = {
  professionalSummary: "Professional Summary",
  skills: "Skills",
  professionalExperience: "Professional Experience",
  education: "Education",
  certifications: "Certifications",
  projects: "Projects",
  languages: "Languages",
};

export const OPTIONAL_RESUME_SECTIONS = [
  "certifications",
  "projects",
  "languages",
] as const satisfies readonly ResumeSectionKey[];

export const CONTACT_LINE_SEPARATOR = " | ";

export const SUMMARY_PLACEHOLDER =
  "2–3 sentences: target role, years of experience, core skills, differentiator.";

export const SKILLS_PLACEHOLDER = "Skill One, Skill Two, Skill Three…";

export const EXPERIENCE_BULLET_PLACEHOLDER =
  "One bullet per line — action verb + task + result";

/** Public API path for browser download of the golden ATS PDF fixture. */
export const ATS_TEMPLATE_PDF_API_PATH = "/api/resume/ats-template?format=pdf";

/** Public API path for browser download of the golden ATS DOCX fixture. */
export const ATS_TEMPLATE_DOCX_API_PATH = "/api/resume/ats-template?format=docx";
