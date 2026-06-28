/**
 * Keyword gap analysis — compares resume content against a job description.
 *
 * Uses shared deterministic keyword extraction (`keyword-extract.ts`) so JD tokens
 * are taxonomy-backed — no plain English / page-noise leakage.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import {
  bigramsOf,
  getSynonymsOf,
  looksLikeTechTerm,
  tokenizeJobText,
} from "@/lib/job-tracker/jd/keyword-extract";
import {
  filterReportableMissingKeywords,
} from "@/lib/job-tracker/jd/jd-skill-filter";

const MIN_TOKEN_LEN = 2;

function tokenize(text: string): string[] {
  return tokenizeJobText(text).filter((t) => t.length >= MIN_TOKEN_LEN);
}

function bigrams(tokens: string[]): string[] {
  return bigramsOf(tokens);
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
  /** 0–100 — exact-only coverage (no synonym credit). */
  exactCoveragePercent: number;
  /** Top missing keywords sorted by tier then frequency (most important first). */
  topMissing: string[];
  /**
   * Missing keywords that the user likely HAS but under a synonym — they can fix
   * this by adding the JD's exact phrasing to their resume.
   */
  injectable: string[];
  /** Missing keywords the user genuinely lacks — need to acquire or honestly omit. */
  nonInjectable: string[];
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

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * JD keywords satisfied by related resume labels (medtech regulatory overlap).
 * Keys are normalized JD phrases; values are normalized resume phrases.
 */
export const KEYWORD_ALIAS_SATISFIERS: Readonly<Record<string, readonly string[]>> = {
  "fda regulations": ["iso 13485", "iso13485"],
  fda: ["iso 13485", "iso13485", "fda regulations"],
};

function resumeSatisfiesKeywordAlias(
  keyword: string,
  resumeText: string,
): boolean {
  const satisfiers = KEYWORD_ALIAS_SATISFIERS[normalizeKeyword(keyword)];
  if (!satisfiers) return false;
  const haystack = resumeText.toLowerCase();
  return satisfiers.some((s) => haystack.includes(s));
}

/** Phrase-aware match — token sets drop stopwords inside skill labels (e.g. "strategic alliances"). */
export function resumeContainsKeyword(
  keyword: string,
  data: PrimeResumeData,
  targetTitle: string,
  resumeText: string,
  resumeTokenSet: Set<string>,
): boolean {
  const kw = normalizeKeyword(keyword);
  if (!kw) return false;

  const haystack = resumeText.toLowerCase();
  if (haystack.includes(kw)) return true;

  for (const skill of data.skills ?? []) {
    const skillNorm = normalizeKeyword(skill);
    if (skillNorm === kw || skillNorm.includes(kw) || kw.includes(skillNorm)) {
      return true;
    }
  }

  if (normalizeKeyword(targetTitle).includes(kw)) return true;
  if (normalizeKeyword(data.summary ?? "").includes(kw)) return true;

  if (resumeTokenSet.has(kw)) return true;

  // Synonym expansion — "k8s" in resume satisfies "kubernetes" in JD
  const synonyms = getSynonymsOf(kw);
  if (synonyms.some((syn) => syn !== kw && (haystack.includes(syn) || resumeTokenSet.has(syn)))) {
    return true;
  }

  return resumeSatisfiesKeywordAlias(keyword, resumeText);
}

/**
 * True if the keyword is present via synonym but not via exact match.
 * Used to classify a missing-exact keyword as "injectable" (user has it under a
 * different label and just needs to add the JD's phrasing).
 */
function matchesBySynonymOnly(
  keyword: string,
  resumeText: string,
  resumeTokenSet: Set<string>,
): boolean {
  const kw = normalizeKeyword(keyword);
  const haystack = resumeText.toLowerCase();
  if (haystack.includes(kw) || resumeTokenSet.has(kw)) return false; // exact match — not "only by synonym"
  const synonyms = getSynonymsOf(kw);
  return synonyms.some((syn) => syn !== kw && (haystack.includes(syn) || resumeTokenSet.has(syn)));
}
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
  options?: { experienceBlob?: string },
): KeywordGapResult {
  const resumeText = resumeToText(data, targetTitle);
  const resumeTokenSet = extractTokenSet(resumeText);
  const keywordPresent = (keyword: string) =>
    resumeContainsKeyword(keyword, data, targetTitle, resumeText, resumeTokenSet);

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
      if (keywordPresent(keyword)) {
        weightedMatched += weight;
        matched.push({ keyword, foundIn: locateKeyword(keyword, data, targetTitle), tier });
      } else {
        missing.push(keyword);
      }
    }
  }

  const coveragePercent =
    weightedTotal === 0 ? 0 : Math.round((weightedMatched / weightedTotal) * 100);

  // Exact coverage — no synonym credit (used in per-platform exact-match scoring)
  const exactMatched = matched.filter((m) =>
    resumeText.toLowerCase().includes(normalizeKeyword(m.keyword)) ||
    resumeTokenSet.has(normalizeKeyword(m.keyword)),
  );
  const exactCoveragePercent =
    weightedTotal === 0 ? 0 : Math.round((exactMatched.length / (exactMatched.length + missing.length)) * 100);

  const tier1Missing = intel.tier1Keywords.filter((k) => !keywordPresent(k));
  const tier2Missing = intel.tier2Keywords.filter((k) => !keywordPresent(k));
  const topMissing = filterReportableMissingKeywords(
    [...tier1Missing, ...tier2Missing].slice(0, 10),
    options?.experienceBlob,
  );

  // Injectable = missing exact keywords the user has via a synonym (easy fix: just add the label)
  // NonInjectable = truly absent — user needs to acquire or omit
  const injectable: string[] = [];
  const nonInjectable: string[] = [];
  for (const kw of missing) {
    if (matchesBySynonymOnly(kw, resumeText, resumeTokenSet)) {
      injectable.push(kw);
    } else {
      nonInjectable.push(kw);
    }
  }

  return { matched, missing, coveragePercent, exactCoveragePercent, topMissing, injectable, nonInjectable };
}

export function analyzeKeywordGap(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
): KeywordGapResult {
  if (!jobDescription.trim()) {
    return { matched: [], missing: [], coveragePercent: 0, exactCoveragePercent: 0, topMissing: [], injectable: [], nonInjectable: [] };
  }

  const jdTokens = tokenize(jobDescription);
  const jdBigrams = bigrams(jdTokens);
  const resumeText = resumeToText(data, targetTitle);
  const resumeTokenSet = extractTokenSet(resumeText);

  const jdFreq = new Map<string, number>();
  for (const t of [...jdTokens, ...jdBigrams]) {
    if (!looksLikeTechTerm(t)) continue;
    jdFreq.set(t, (jdFreq.get(t) ?? 0) + 1);
  }

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

  const injectable: string[] = [];
  const nonInjectable: string[] = [];
  for (const kw of missing) {
    if (matchesBySynonymOnly(kw, resumeText, resumeTokenSet)) {
      injectable.push(kw);
    } else {
      nonInjectable.push(kw);
    }
  }

  return {
    matched,
    missing,
    coveragePercent,
    exactCoveragePercent: coveragePercent,
    topMissing: missing.slice(0, 10),
    injectable,
    nonInjectable,
  };
}
