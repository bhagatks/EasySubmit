/**
 * Canonical resume formatting constants.
 * Rules document: docs/resume/RULES.md
 * Golden fixtures: assets/resume/templates/
 */

export const RESUME_ASSETS_DIR = "assets/resume";
export const RESUME_RULES_RELATIVE_PATH = "docs/resume/RULES.md";
export const ATS_TEMPLATE_RELATIVE_DIR = `${RESUME_ASSETS_DIR}/templates`;
export const BHAGATH_SAMPLE_RELATIVE_DIR = `${RESUME_ASSETS_DIR}/samples`;

/** @deprecated Use RESUME_RULES_RELATIVE_PATH — basename kept for legacy references */
export const RESUME_RULES_FILENAME = "RULES.md";

/** ATS body fonts — single family only; see docs/resume/RULES.md §1. */
export {
  DEFAULT_RESUME_FONT_ID,
  RESUME_FONTS,
  type ResumeFontId,
} from "@/lib/resume/resume-fonts";

export const ATS_TEMPLATE_PDF_FILENAME = "ATS_Universal_Resume_Template.pdf";
export const ATS_TEMPLATE_DOCX_FILENAME = "ATS_Universal_Resume_Template.docx";
export const BHAGATH_SAMPLE_PDF_FILENAME = "ATS_Bhagath_Sample.pdf";

export const ATS_TEMPLATE_PDF_RELATIVE_PATH = `${ATS_TEMPLATE_RELATIVE_DIR}/${ATS_TEMPLATE_PDF_FILENAME}`;
export const ATS_TEMPLATE_DOCX_RELATIVE_PATH = `${ATS_TEMPLATE_RELATIVE_DIR}/${ATS_TEMPLATE_DOCX_FILENAME}`;
export const BHAGATH_SAMPLE_PDF_RELATIVE_PATH = `${BHAGATH_SAMPLE_RELATIVE_DIR}/${BHAGATH_SAMPLE_PDF_FILENAME}`;

/** Fixed ATS section order — see docs/resume/RULES.md §3. */
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
