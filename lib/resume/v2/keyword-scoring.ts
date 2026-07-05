/**
 * RULES v2 keyword scoring — JD intelligence first, filtered raw JD fallback.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import {
  jdIntelligenceHasKeywords,
  resolveKeywordGap,
} from "@/lib/job-tracker/ats/resolve-keyword-gap";
import { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";
import { extractJDIntelligenceSync } from "@/lib/job-tracker/jd/jd-extractor";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import {
  canonicalizeJdSkillLabel,
  filterReportableMissingKeywords,
} from "@/lib/job-tracker/jd/jd-skill-filter";
import { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";

export type ResolveKeywordGapForReadinessV2Options = {
  experienceBlob?: string;
};

function isReportableScoringKeyword(keyword: string): boolean {
  return Boolean(canonicalizeJdSkillLabel(keyword));
}

export function deriveJDIntelligenceForReadinessV2(
  jobDescription: string,
  targetTitle: string,
  cached?: JDIntelligence | null,
): JDIntelligence | null {
  if (jdIntelligenceHasKeywords(cached)) {
    return cached ?? null;
  }

  const trimmed = jobDescription.trim();
  if (!trimmed) return null;

  const { cleaned } = cleanJobDescription(trimmed);
  const segments = segmentJobDescription(cleaned);
  const derived = extractJDIntelligenceSync(segments, targetTitle);
  return jdIntelligenceHasKeywords(derived) ? derived : null;
}

/** Recompute coverage using reportable keywords only (drops HR/page noise from denominator). */
export function filterKeywordGapForReadinessV2(
  gap: KeywordGapResult,
  experienceBlob?: string,
): KeywordGapResult {
  const matched = gap.matched.filter((entry) => isReportableScoringKeyword(entry.keyword));
  const missing = gap.missing.filter((keyword) => isReportableScoringKeyword(keyword));
  const total = matched.length + missing.length;
  const coveragePercent =
    total === 0 ? gap.coveragePercent : Math.round((matched.length / total) * 100);

  const exactMatchedCount = matched.filter((entry) =>
    gap.matched.some(
      (original) =>
        original.keyword === entry.keyword &&
        (gap.exactCoveragePercent === 100 ||
          original.foundIn.length > 0),
    ),
  ).length;
  const exactCoveragePercent =
    total === 0 ? gap.exactCoveragePercent : Math.round((exactMatchedCount / total) * 100);

  return {
    ...gap,
    matched,
    missing,
    coveragePercent,
    exactCoveragePercent,
    topMissing: filterReportableMissingKeywords(
      [...missing].slice(0, 10),
      experienceBlob,
    ),
  };
}

export function resolveKeywordGapForReadinessV2(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  jdIntelligence?: JDIntelligence | null,
  options?: ResolveKeywordGapForReadinessV2Options,
): KeywordGapResult {
  const intelligence = deriveJDIntelligenceForReadinessV2(
    jobDescription,
    targetTitle,
    jdIntelligence,
  );

  const gap = resolveKeywordGap(
    data,
    targetTitle,
    jobDescription,
    intelligence,
    options?.experienceBlob ? { experienceBlob: options.experienceBlob } : undefined,
  );

  if (jdIntelligenceHasKeywords(intelligence)) {
    return gap;
  }

  return filterKeywordGapForReadinessV2(gap, options?.experienceBlob);
}

export function buildExperienceBlobFromPrime(data: PrimeResumeData): string {
  return (data.experience ?? [])
    .flatMap((entry) => [
      entry.title,
      entry.company,
      ...(entry.bullets ?? []),
    ])
    .filter(Boolean)
    .join(" ");
}
