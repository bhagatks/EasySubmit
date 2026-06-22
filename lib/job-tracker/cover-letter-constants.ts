/** Shared cover letter constants — used by both deterministic and AI paths. */

export const COVER_LETTER_WORD_TARGET = { min: 260, ideal: 325, max: 450 } as const;

export function countCoverLetterWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
