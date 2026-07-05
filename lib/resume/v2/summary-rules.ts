import {
  countSummarySentences,
  countSummaryWords,
  findBannedWords,
} from "@/lib/resume/summary-rules";
import type { SummaryRulesV2 } from "@/lib/resume/v2/rules-config";

export type SummaryValidationV2 = {
  sentenceCount: number;
  wordCount: number;
  bannedWords: string[];
  warnings: string[];
  errors: string[];
};

export type ValidateSummaryV2Options = {
  modeLabel?: string;
  unlimitedContent?: boolean;
};

export function validateSummaryV2(
  text: string,
  rules: SummaryRulesV2,
  options: ValidateSummaryV2Options = {},
): SummaryValidationV2 {
  const modeLabel = options.modeLabel ?? "2-page";
  const unlimitedContent = options.unlimitedContent === true;
  const sentenceCount = countSummarySentences(text);
  const wordCount = countSummaryWords(text);
  const bannedWords = findBannedWords(text);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!unlimitedContent) {
    if (sentenceCount < rules.targetSentencesMin || sentenceCount > rules.targetSentencesMax) {
      if (sentenceCount >= rules.warnSentencesFrom) {
        warnings.push(
          `Summary has ${sentenceCount} sentences — target ${rules.targetSentencesMin}–${rules.targetSentencesMax} for ${modeLabel} mode.`,
        );
      } else if (sentenceCount > 0) {
        warnings.push(
          `Summary has ${sentenceCount} sentences — target ${rules.targetSentencesMin}–${rules.targetSentencesMax} for ${modeLabel} mode.`,
        );
      }
    }

    if (wordCount >= rules.errorWordsFrom) {
      errors.push(
        `Summary is ${wordCount} words — maximum recommended is ${rules.wordTargetMax} (hard concern above ${rules.errorWordsFrom - 1}).`,
      );
    } else if (wordCount >= rules.warnWordsFrom && wordCount <= rules.warnWordsTo) {
      warnings.push(
        `Summary is ${wordCount} words — target ${rules.wordTargetMin}–${rules.wordTargetMax} for ${modeLabel} mode.`,
      );
    } else if (wordCount > 0 && (wordCount < rules.wordTargetMin || wordCount > rules.wordTargetMax)) {
      warnings.push(
        `Summary is ${wordCount} words — target ${rules.wordTargetMin}–${rules.wordTargetMax} for ${modeLabel} mode.`,
      );
    }
  } else if (wordCount > 0 && wordCount < rules.wordTargetMin) {
    warnings.push(
      `Summary is ${wordCount} words — consider at least ${rules.wordTargetMin} words for context.`,
    );
  }

  if (bannedWords.length > 0) {
    warnings.push(`Summary contains discouraged phrases: ${bannedWords.join(", ")}.`);
  }

  return { sentenceCount, wordCount, bannedWords, warnings, errors };
}
