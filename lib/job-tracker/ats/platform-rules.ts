/**
 * ATS Platform Rules — platform-specific behavior adjustments.
 *
 * Different ATS platforms parse resumes differently. When we can detect
 * the platform (from job URL or the platform field on the tracker entry),
 * we apply targeted rules that go beyond the universal baseline.
 */

export type AtsPlatform =
  | "workday"
  | "greenhouse"
  | "lever"
  | "icims"
  | "taleo"
  | "bamboohr"
  | "smartrecruiters"
  | "jobvite"
  | "adp"
  | "unknown";

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
    tip: "Workday uses exact keyword matching — ensure your Skills section mirrors the JD terminology precisely. Use Word export for best parsing.",
  },
  taleo: {
    label: "Taleo (Oracle)",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: false,
    strictDates: true,
    tip: "Taleo has an older parser that struggles with PDFs. Always use Word export. Keep formatting minimal and dates in MM/YYYY format.",
  },
  icims: {
    label: "iCIMS",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    tip: "iCIMS does exact string matching — 'React' and 'ReactJS' are different tokens. Match JD casing exactly in your skills section.",
  },
  greenhouse: {
    label: "Greenhouse",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    tip: "Greenhouse has a modern parser with semantic matching and handles PDFs well. Focus on keyword density in the summary section.",
  },
  lever: {
    label: "Lever",
    preferredFormat: "either",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    tip: "Lever uses a modern context-aware parser. Bullet quality and achievement framing matter more than raw keyword count.",
  },
  bamboohr: {
    label: "BambooHR",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: false,
    strictDates: false,
    tip: "BambooHR has a modern parser. Focus on clear section structure and strong bullet quality.",
  },
  smartrecruiters: {
    label: "SmartRecruiters",
    preferredFormat: "pdf",
    exactKeywordMatch: false,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    tip: "SmartRecruiters weights skills and experience equally. Ensure your skills section fully matches the JD's required technologies.",
  },
  jobvite: {
    label: "Jobvite",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: false,
    skillsSectionWeighted: true,
    strictDates: false,
    tip: "Jobvite performs keyword frequency analysis — repeat your top 3-5 skills across summary, skills section, and bullets.",
  },
  adp: {
    label: "ADP Workforce Now",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: false,
    strictDates: true,
    tip: "ADP has a legacy parser similar to Taleo. Use Word export and standard section names. Avoid tables, columns, or headers.",
  },
  unknown: {
    label: "Unknown ATS",
    preferredFormat: "word",
    exactKeywordMatch: true,
    sectionTitleSensitive: true,
    skillsSectionWeighted: true,
    strictDates: true,
    tip: "Use Word export as the universal safe choice. Exact keyword matching is the baseline assumption for all ATS platforms.",
  },
};

// ─── Platform detection ───────────────────────────────────────────────────────

const URL_PATTERNS: Array<{ pattern: RegExp; platform: AtsPlatform }> = [
  { pattern: /myworkdayjobs\.com|workday\.com/i, platform: "workday" },
  { pattern: /greenhouse\.io|boards\.greenhouse\.io/i, platform: "greenhouse" },
  { pattern: /lever\.co|jobs\.lever\.co/i, platform: "lever" },
  { pattern: /icims\.com/i, platform: "icims" },
  { pattern: /taleo\.net|oracle\.com\/taleo/i, platform: "taleo" },
  { pattern: /bamboohr\.com/i, platform: "bamboohr" },
  { pattern: /smartrecruiters\.com/i, platform: "smartrecruiters" },
  { pattern: /jobvite\.com/i, platform: "jobvite" },
  { pattern: /adp\.com/i, platform: "adp" },
];

const PLATFORM_NAME_MAP: Record<string, AtsPlatform> = {
  workday: "workday",
  greenhouse: "greenhouse",
  lever: "lever",
  icims: "icims",
  taleo: "taleo",
  bamboohr: "bamboohr",
  bamboo: "bamboohr",
  smartrecruiters: "smartrecruiters",
  jobvite: "jobvite",
  adp: "adp",
  linkedin: "unknown",
  indeed: "unknown",
};

export function detectPlatform(
  canonicalUrl: string,
  platformField: string | null | undefined,
): AtsPlatform {
  for (const { pattern, platform } of URL_PATTERNS) {
    if (pattern.test(canonicalUrl)) return platform;
  }

  if (platformField) {
    const normalized = platformField.toLowerCase().replace(/\s+/g, "");
    const match = PLATFORM_NAME_MAP[normalized];
    if (match) return match;
  }

  return "unknown";
}

export function getPlatformRules(platform: AtsPlatform): PlatformRule {
  return PLATFORM_RULES[platform];
}
