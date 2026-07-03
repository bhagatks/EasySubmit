/**
 * ATS Platform Rules — platform-specific behavior adjustments.
 *
 * Different ATS platforms parse resumes differently. When we can detect
 * the platform (from job URL or the platform field on the tracker entry),
 * we apply targeted rules that go beyond the universal baseline.
 */

import {
  type AtsPlatform,
  detectAtsPlatform,
} from "@/src/shared/ats-platform-detection";

export type { AtsPlatform } from "@/src/shared/ats-platform-detection";
export { KNOWN_ATS_PLATFORMS } from "@/src/shared/ats-platform-detection";

export type PlatformStrategy =
  | "keyword_search"
  | "ai_match"
  | "parse_first"
  | "human_review";

export type PlatformRule = {
  /** Human-readable platform name. */
  label: string;
  /** Preferred export format for this platform. */
  preferredFormat: "word" | "pdf" | "either";
  /** Whether this platform does exact keyword matching (no stemming/synonyms). */
  exactKeywordMatch: boolean;
  /** Whether this platform is sensitive to section title names. */
  sectionTitleSensitive: boolean;
  /** Whether skills section is heavily weighted in scoring. */
  skillsSectionWeighted: boolean;
  /** Whether date format matters (strict MM/YYYY expected). */
  strictDates: boolean;
  /** Shortlisting strategy archetype — drives scoring emphasis and enhance instructions. */
  strategy: PlatformStrategy;
  /** Actionable tip shown to the user on the ATS panel. */
  tip: string;
};

const PLATFORM_RULES: Record<AtsPlatform, PlatformRule> = {
  workday: {
    label: "Workday",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "parse_first",
    tip: "Workday parses your resume into structured fields first — use standard job titles, strict MM/YYYY dates, and canonical certification names. Keyword coverage is secondary to parse fidelity.",
  },
  taleo: {
    label: "Taleo (Oracle)",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: false,
    strictDates: true,
    strategy: "keyword_search",
    tip: "Taleo uses legacy boolean keyword search — mirror JD phrasing exactly, include acronym and spelled-out skill forms, and use Word export with minimal formatting.",
  },
  oraclecloud: {
    label: "Oracle Recruiting Cloud",
    preferredFormat: "word",
    exactKeywordMatch: false,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "ai_match",
    tip: "Oracle Recruiting Cloud ranks candidates algorithmically — mirror stated requirements (years, must-have skills, certifications) and broaden your skills taxonomy to match the JD.",
  },
  icims: {
    label: "iCIMS",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "ai_match",
    tip: "iCIMS Role Fit scores algorithmically — align skills to the JD taxonomy, state required years and certifications plainly, and match JD terminology in summary and bullets.",
  },
  greenhouse: {
    label: "Greenhouse",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "Greenhouse does not algorithmically score resumes — recruiters use human scorecards. Prioritize readable, quantified achievement bullets and a tight role-aligned summary rather than keyword stuffing.",
  },
  lever: {
    label: "Lever",
    preferredFormat: "either",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "Lever relies on human review — focus on clear achievement bullets with measurable impact and a concise summary aligned to the role.",
  },
  bamboohr: {
    label: "BambooHR",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "BambooHR uses human review — emphasize readable structure, strong bullet quality, and quantified outcomes rather than keyword repetition.",
  },
  smartrecruiters: {
    label: "SmartRecruiters",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "SmartRecruiters SmartAssistant ranks candidates — mirror JD requirements explicitly and ensure your skills section covers the full taxonomy of required technologies.",
  },
  jobvite: {
    label: "Jobvite",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "keyword_search",
    tip: "Jobvite performs keyword frequency analysis — repeat your top 3–5 skills across summary, skills section, and bullets, using both acronyms and spelled-out forms.",
  },
  adp: {
    label: "ADP Workforce Now",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: false,
    strictDates: true,
    strategy: "keyword_search",
    tip: "ADP uses legacy keyword search — use Word export, standard section names, exact JD phrasing, and strict MM/YYYY dates.",
  },
  paycom: {
    label: "Paycom",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "keyword_search",
    tip: "Paycom relies on keyword matching — mirror JD terminology exactly, repeat top skills across sections, and use Word export for best parsing.",
  },
  paylocity: {
    label: "Paylocity",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "keyword_search",
    tip: "Paylocity uses keyword search — match JD phrasing in skills and bullets, include acronym and full-form variants, and prefer Word export.",
  },
  linkedin: {
    label: "LinkedIn",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "LinkedIn algorithmically ranks applicants — state must-have skills and years of experience plainly, and align your skills section to the posted requirements.",
  },
  indeed: {
    label: "Indeed",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Indeed uses algorithmic matching — mirror the JD's stated requirements and broaden skill coverage to match the posting's taxonomy.",
  },
  ashby: {
    label: "Ashby",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Ashby ranks candidates algorithmically — align skills to JD requirements, state certifications and years plainly, and mirror the posting's language.",
  },
  successfactors: {
    label: "SAP SuccessFactors",
    preferredFormat: "word",
    exactKeywordMatch: false,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "ai_match",
    tip: "SuccessFactors AI-Assisted Skills Matching ranks candidates — mirror must-have skills and certifications from the JD and use standard section titles.",
  },
  workable: {
    label: "Workable",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Workable Agent screens algorithmically — cover the JD skill taxonomy broadly and state experience requirements in plain text.",
  },
  clearcompany: {
    label: "ClearCompany",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "ClearCompany AI Talent Match ranks candidates — align skills to JD requirements and mirror stated certifications and years of experience.",
  },
  teamtailor: {
    label: "Teamtailor",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Teamtailor's top-applicant AI ranks candidates — broaden skill coverage to match the JD and state must-have requirements explicitly.",
  },
  rippling: {
    label: "Rippling",
    preferredFormat: "either",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "Rippling uses human review — prioritize readable, quantified achievement bullets and a concise role-aligned summary.",
  },
  jazzhr: {
    label: "JazzHR",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "JazzHR relies on human review — focus on clear bullet quality and measurable impact rather than keyword stuffing.",
  },
  breezy: {
    label: "Breezy HR",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "Breezy uses human review — emphasize readable structure and quantified achievement bullets over keyword density.",
  },
  recruitee: {
    label: "Recruitee",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    strategy: "human_review",
    tip: "Recruitee relies on human review — prioritize strong bullet quality and a tight summary aligned to the role.",
  },
  wellfound: {
    label: "Wellfound",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Wellfound uses algorithmic matching — mirror startup-relevant skills from the JD and state experience requirements plainly.",
  },
  ziprecruiter: {
    label: "ZipRecruiter",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "ZipRecruiter algorithmically matches candidates — align skills to JD requirements and repeat top must-have keywords naturally across sections.",
  },
  phenom: {
    label: "Phenom",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    strategy: "ai_match",
    tip: "Phenom uses AI-driven candidate matching — mirror JD requirements explicitly and broaden skill taxonomy coverage.",
  },
  unknown: {
    label: "Unknown ATS",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    strategy: "keyword_search",
    tip: "Use Word export as the universal safe choice. Exact keyword matching is the baseline assumption when the ATS platform is unknown.",
  },
};

export function detectPlatform(
  canonicalUrl: string,
  platformField: string | null | undefined,
): AtsPlatform {
  return detectAtsPlatform(canonicalUrl, platformField);
}

export function getPlatformRules(platform: AtsPlatform): PlatformRule {
  return PLATFORM_RULES[platform];
}

/** Resolve strategy for a platform — `unknown` falls back to keyword_search. */
export function resolvePlatformStrategy(platform: AtsPlatform): PlatformStrategy {
  if (platform === "unknown") return "keyword_search";
  return PLATFORM_RULES[platform].strategy;
}
