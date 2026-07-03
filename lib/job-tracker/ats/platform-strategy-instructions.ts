import type { PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";

export const PLATFORM_STRATEGY_MARKERS: Record<PlatformStrategy, string> = {
  keyword_search: "PLATFORM STRATEGY: KEYWORD SEARCH",
  ai_match: "PLATFORM STRATEGY: AI MATCH",
  parse_first: "PLATFORM STRATEGY: PARSE FIRST",
  human_review: "PLATFORM STRATEGY: HUMAN REVIEW",
};

const STRATEGY_BLOCKS: Record<PlatformStrategy, string[]> = {
  keyword_search: [
    "Aggressive exact-keyword coverage for legacy boolean / keyword-search ATS behavior.",
    "Mirror JD phrasing verbatim where the candidate genuinely supports it.",
    "Include BOTH acronym and spelled-out forms of skills (e.g. \"CI/CD\" and \"continuous integration\").",
    "Repeat the top 3–5 must-have skills naturally across summary, Skills section, and experience bullets.",
    "Do not violate resume spec: fixed section order and standard section titles are immutable.",
  ],
  ai_match: [
    "Maximize skills-taxonomy breadth using JD requirements plus O*NET/ESCO vocabulary already in context.",
    "Explicitly mirror stated JD requirements in plain text: years of experience, must-have skills, certifications.",
    "Align summary and bullets to the JD's requirement language where truthfully supported.",
    "Prefer breadth of relevant skills over repeating the same keyword many times.",
    "Do not violate resume spec: fixed section order and standard section titles are immutable.",
  ],
  parse_first: [
    "Parse fidelity dominates — the ATS extracts structured fields before any ranking.",
    "Normalize job titles to standard industry titles (no creative or internal-only titles).",
    "Use strict MM/YYYY dates on every experience and education entry.",
    "Write certifications in canonical form (full name, widely recognized abbreviation).",
    "Keyword coverage is secondary to clean structure, standard titles, and accurate dates.",
    "Do not violate resume spec: fixed section order and standard section titles are immutable.",
  ],
  human_review: [
    "Recruiters read the resume directly — no algorithmic keyword scoring.",
    "Prioritize readability and quantified impact bullets over keyword density.",
    "Write a tight summary aligned to the role; do not stuff keywords.",
    "Each bullet should be scannable with one clear achievement and metric where truthful.",
    "Do not repeat the same skill phrase across every section — clarity beats frequency.",
    "Do not violate resume spec: fixed section order and standard section titles are immutable.",
  ],
};

export function buildPlatformStrategyInstructionBlock(
  strategy: PlatformStrategy,
): string {
  const marker = PLATFORM_STRATEGY_MARKERS[strategy];
  const lines = STRATEGY_BLOCKS[strategy];
  return [marker, ...lines.map((line) => `- ${line}`)].join("\n");
}
