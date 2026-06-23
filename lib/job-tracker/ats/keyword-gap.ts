/**
 * Keyword gap analysis — compares resume content against a job description.
 *
 * Approach: simple but effective token matching. No heavy NLP.
 * Extracts meaningful terms (skills, tools, titles, methodologies),
 * compares case-insensitively, handles acronyms + common variations.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";

// ─── Stop words ────────────────────────────────────────────────────────────────
// Common English words that carry no signal for ATS matching.

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","as","is","was","are","were","be","been","being","have","has",
  "had","do","does","did","will","would","could","should","may","might","shall",
  "can","need","must","this","that","these","those","it","its","we","our",
  "you","your","they","their","he","she","his","her","us","me","my","i",
  "not","no","so","if","then","than","when","where","who","which","what",
  "how","all","each","every","both","few","more","most","other","some",
  "such","into","about","above","after","before","between","through","during",
  "also","just","only","very","well","new","good","high","large","small",
  "over","under","back","still","own","same","right","work","working","worked",
  "use","using","used","make","made","making","help","helping","helped",
  "ensure","ensuring","support","supporting","supported","including","include",
  // HR / job-posting filler — not ATS skills
  "position","positions","role","roles","opportunity","opportunities",
  "candidate","candidates","apply","application","applications","hiring","hire",
  "join","joining","compensation","benefits","benefit","pay","salary","package",
  "culture","innovation","innovative","passionate","passion","growth","impact",
  "environment","team","teams","company","organization","business","industry",
  "experience","experiences","skill","skills","ability","abilities","knowledge",
  "required","requirements","preferred","plus","bonus","ideal","strong","excellent",
  "great","key","core","primary","secondary","relevant","related","demonstrated",
]);

// Minimum token length to consider meaningful
const MIN_TOKEN_LEN = 2;

// ─── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // preserve C++, C#, .NET, Node.js style terms
    .replace(/\bnode\.js\b/gi, "nodejs")
    .replace(/\bvue\.js\b/gi, "vuejs")
    .replace(/\breact\.js\b/gi, "reactjs")
    .replace(/\bnext\.js\b/gi, "nextjs")
    .replace(/\b\.net\b/gi, "dotnet")
    .replace(/\bc\+\+/gi, "cplusplus")
    .replace(/\bc#/gi, "csharp")
    // split on non-alphanumeric (keep hyphenated as one token)
    .split(/[^a-z0-9#+\-]/g)
    .map((t) => t.replace(/^[-]+|[-]+$/g, "")) // strip leading/trailing hyphens
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOP_WORDS.has(t));
}

/** Extract bigrams (two-word phrases) for multi-word tech terms. */
function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    result.push(pair);
  }
  return result;
}

function extractTokenSet(text: string): Set<string> {
  const tokens = tokenize(text);
  return new Set([...tokens, ...bigrams(tokens)]);
}

// ─── Resume text builder ───────────────────────────────────────────────────────

function resumeToText(data: PrimeResumeData, targetTitle: string): string {
  const parts: string[] = [targetTitle, data.summary ?? ""];

  // Skills are the highest-weight section — include twice to reflect ATS scoring
  parts.push(...(data.skills ?? []), ...(data.skills ?? []));

  for (const exp of data.experience ?? []) {
    parts.push(exp.title, exp.company, ...(exp.bullets ?? []));
  }
  for (const edu of data.education ?? []) {
    parts.push(edu.degree ?? "", edu.school);
  }
  parts.push(...(data.certifications ?? []), ...(data.projects ?? []));
  for (const section of data.customSections ?? []) {
    parts.push(section.title, section.content);
  }

  return parts.filter(Boolean).join(" ");
}

// ─── Public types ──────────────────────────────────────────────────────────────

export type KeywordMatch = {
  keyword: string;
  /** Where in the resume this keyword appears. */
  foundIn: ("skills" | "experience" | "summary" | "education" | "other")[];
  /** Tier from JD intelligence: 1 = requirements, 2 = responsibilities, 3 = preferred. */
  tier?: 1 | 2 | 3;
};

export type KeywordGapResult = {
  /** Keywords in the JD that are present in the resume. */
  matched: KeywordMatch[];
  /** Keywords in the JD that are absent from the resume. */
  missing: string[];
  /** 0–100 — what % of JD keywords the resume covers. */
  coveragePercent: number;
  /** Top missing keywords sorted by tier then frequency (most important first). */
  topMissing: string[];
};

// ─── Keyword locator ──────────────────────────────────────────────────────────

function locateKeyword(
  keyword: string,
  data: PrimeResumeData,
  targetTitle: string,
): KeywordMatch["foundIn"] {
  const found: Set<KeywordMatch["foundIn"][0]> = new Set();
  const kw = keyword.toLowerCase();

  const inStr = (s: string | null | undefined) =>
    (s ?? "").toLowerCase().includes(kw);

  if (inStr(targetTitle) || inStr(data.summary)) found.add("summary");
  if ((data.skills ?? []).some((s) => inStr(s))) found.add("skills");

  for (const exp of data.experience ?? []) {
    if (inStr(exp.title) || inStr(exp.company) || (exp.bullets ?? []).some(inStr)) {
      found.add("experience");
      break;
    }
  }

  for (const edu of data.education ?? []) {
    if (inStr(edu.degree) || inStr(edu.school)) {
      found.add("education");
      break;
    }
  }

  if (
    [...(data.certifications ?? []), ...(data.projects ?? [])].some(inStr) ||
    (data.customSections ?? []).some((s) => inStr(s.title) || inStr(s.content))
  ) {
    found.add("other");
  }

  return Array.from(found);
}

// ─── Public API ───────────────────────────────────────────────────────────────

// ─── Tiered API (preferred when JDIntelligence is available) ──────────────────
// Uses tier-weighted coverage: tier1 ×3, tier2 ×2, tier3 ×1.
// Tier-1 misses (requirements keywords) have 3× the scoring impact of tier-3.

export function analyzeKeywordGapFromIntelligence(
  data: PrimeResumeData,
  intel: {
    tier1Keywords: string[];
    tier2Keywords: string[];
    tier3Keywords: string[];
  },
  targetTitle: string,
): KeywordGapResult {
  const resumeText = resumeToText(data, targetTitle);
  const resumeTokenSet = extractTokenSet(resumeText);

  const matched: KeywordMatch[] = [];
  const missing: string[] = [];

  // Weights: tier1=3, tier2=2, tier3=1
  const tiers: Array<{ keywords: string[]; tier: 1 | 2 | 3; weight: number }> = [
    { keywords: intel.tier1Keywords, tier: 1, weight: 3 },
    { keywords: intel.tier2Keywords, tier: 2, weight: 2 },
    { keywords: intel.tier3Keywords, tier: 3, weight: 1 },
  ];

  let weightedMatched = 0;
  let weightedTotal = 0;

  for (const { keywords, tier, weight } of tiers) {
    for (const keyword of keywords) {
      weightedTotal += weight;
      const inResume = resumeTokenSet.has(keyword);
      if (inResume) {
        weightedMatched += weight;
        matched.push({ keyword, foundIn: locateKeyword(keyword, data, targetTitle), tier });
      } else {
        missing.push(keyword);
      }
    }
  }

  const coveragePercent =
    weightedTotal === 0 ? 0 : Math.round((weightedMatched / weightedTotal) * 100);

  // topMissing: tier1 first (most impactful), then tier2, then tier3
  const tier1Missing = intel.tier1Keywords.filter((k) => !resumeTokenSet.has(k));
  const tier2Missing = intel.tier2Keywords.filter((k) => !resumeTokenSet.has(k));
  const topMissing = [...tier1Missing, ...tier2Missing].slice(0, 10);

  return { matched, missing, coveragePercent, topMissing };
}

export function analyzeKeywordGap(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
): KeywordGapResult {
  if (!jobDescription.trim()) {
    return { matched: [], missing: [], coveragePercent: 0, topMissing: [] };
  }

  const jdTokens = tokenize(jobDescription);
  const jdBigrams = bigrams(jdTokens);
  const resumeText = resumeToText(data, targetTitle);
  const resumeTokenSet = extractTokenSet(resumeText);

  // Count token frequency in JD for ranking
  const jdFreq = new Map<string, number>();
  for (const t of [...jdTokens, ...jdBigrams]) {
    jdFreq.set(t, (jdFreq.get(t) ?? 0) + 1);
  }

  // Prefer tokens that appear ≥2 times; fall back to ≥1 for short JDs where
  // few tokens repeat — otherwise candidateKeywords collapses to near-empty
  // and coveragePercent becomes 0 regardless of resume quality.
  const strictCandidates = Array.from(jdFreq.entries())
    .filter(([, freq]) => freq >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([kw]) => kw);

  const candidateKeywords = strictCandidates.length >= 5
    ? strictCandidates
    : Array.from(jdFreq.entries())
        .filter(([, freq]) => freq >= 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([kw]) => kw);

  const matched: KeywordMatch[] = [];
  const missing: string[] = [];

  for (const keyword of candidateKeywords) {
    const inResume = resumeTokenSet.has(keyword);
    if (inResume) {
      matched.push({
        keyword,
        foundIn: locateKeyword(keyword, data, targetTitle),
      });
    } else {
      missing.push(keyword);
    }
  }

  const total = matched.length + missing.length;
  const coveragePercent = total === 0 ? 0 : Math.round((matched.length / total) * 100);

  return {
    matched,
    missing,
    coveragePercent,
    topMissing: missing.slice(0, 10),
  };
}
