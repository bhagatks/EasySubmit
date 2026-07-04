import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import {
  analyzeKeywordGap,
  analyzeKeywordGapFromIntelligence,
  type KeywordGapResult,
} from "@/lib/job-tracker/ats/keyword-gap";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

export type ResolveKeywordGapOptions = {
  experienceBlob?: string;
};

/** True when cached JD intelligence has at least one tier keyword to score against. */
export function jdIntelligenceHasKeywords(
  jdIntelligence: JDIntelligence | null | undefined,
): boolean {
  if (!jdIntelligence) return false;
  return (
    jdIntelligence.tier1Keywords.length > 0 ||
    jdIntelligence.tier2Keywords.length > 0 ||
    jdIntelligence.tier3Keywords.length > 0
  );
}

/**
 * Single keyword-gap entry point for job-scoped scoring surfaces.
 * Uses tier-weighted JD intelligence when cached; falls back to raw JD token gap.
 */
export function resolveKeywordGap(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  jdIntelligence?: JDIntelligence | null,
  options?: ResolveKeywordGapOptions,
): KeywordGapResult {
  if (jdIntelligenceHasKeywords(jdIntelligence)) {
    return analyzeKeywordGapFromIntelligence(
      data,
      jdIntelligence!,
      targetTitle,
      options?.experienceBlob ? { experienceBlob: options.experienceBlob } : undefined,
    );
  }
  return analyzeKeywordGap(data, targetTitle, jobDescription);
}
