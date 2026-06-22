"use client";

import { useMemo } from "react";
import type { JobAndResumeContext } from "@/lib/job-tracker/extract-job-resume-context";
import {
  generateCoverLetter,
  type CoverLetterGeneratorFailure,
  type CoverLetterGeneratorInput,
  type CoverLetterGeneratorJdData,
  type CoverLetterGeneratorResumeData,
  type CoverLetterGeneratorSuccess,
  type CoverLetterTemplateIndices,
} from "@/lib/job-tracker/cover-letter-generator";
import type { CoverLetterComposition } from "@/lib/job-tracker/cover-letter-template-matrix";

export type UseCoverLetterGeneratorInput = {
  resumeData: CoverLetterGeneratorResumeData | null | undefined;
  jdData: CoverLetterGeneratorJdData | null | undefined;
  /** When false, skips generation and clears output. Default: true */
  enabled?: boolean;
};

export type UseCoverLetterGeneratorState = {
  /** Final Markdown letter, or null when not ready / errored. */
  markdown: string | null;
  error: string | null;
  errorCode: CoverLetterGeneratorFailure["code"] | null;
  warnings: string[];
  composition: CoverLetterComposition | null;
  indices: CoverLetterTemplateIndices | null;
  placeholders: CoverLetterGeneratorSuccess["placeholders"] | null;
  isReady: boolean;
  isError: boolean;
};

/**
 * React hook — deterministically generates a cover letter from parser output.
 *
 * Recomputes when `resumeData`, `jdData`, or `enabled` changes.
 * Same company name always selects the same template variation.
 */
export function useCoverLetterGenerator(
  input: UseCoverLetterGeneratorInput,
): UseCoverLetterGeneratorState {
  const { resumeData, jdData, enabled = true } = input;

  return useMemo(() => {
    const empty: UseCoverLetterGeneratorState = {
      markdown: null,
      error: null,
      errorCode: null,
      warnings: [],
      composition: null,
      indices: null,
      placeholders: null,
      isReady: false,
      isError: false,
    };

    if (!enabled) {
      return empty;
    }

    if (!resumeData || !jdData) {
      return {
        ...empty,
        error: !resumeData
          ? "Resume data is not available yet."
          : "Job description data is not available yet.",
        errorCode: !resumeData ? "missing_resume" : "missing_jd",
        isError: true,
      };
    }

    const payload: CoverLetterGeneratorInput = { resumeData, jdData };
    const result = generateCoverLetter(payload);

    if (!result.ok) {
      return {
        ...empty,
        error: result.error,
        errorCode: result.code,
        isError: true,
      };
    }

    return {
      markdown: result.markdown,
      error: null,
      errorCode: null,
      warnings: result.warnings,
      composition: result.composition,
      indices: result.indices,
      placeholders: result.placeholders,
      isReady: true,
      isError: false,
    };
  }, [enabled, resumeData, jdData]);
}

/** Convenience: split a combined parser result into hook inputs. */
export function coverLetterGeneratorInputFromContext(
  context: JobAndResumeContext,
): CoverLetterGeneratorInput {
  return {
    resumeData: context.resume,
    jdData: context.job,
  };
}
