export const SUMMARY_BANNED_WORDS: string[] = [
  "leverage",
  "spearhead",
  "passionate",
  "dynamic",
  "robust",
  "innovative",
  "cutting-edge",
  "synergy",
  "utilize",
  "facilitate",
  "foster",
  "delve",
  "comprehensive",
  "results-driven",
  "thought leader",
  "proven track record",
  "detail-oriented",
  "self-starter",
  "extensive experience",
  "diverse range of",
  "seasoned professional",
  "highly motivated",
  "team player",
  "visionary",
  "mission-critical",
  "in today's fast-paced environment",
];

export const SUMMARY_SENTENCE_COUNT = 4;
export const SUMMARY_WORD_MIN = 70;
export const SUMMARY_WORD_MAX = 80;

export function countSummaryWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countSummarySentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const segments = trimmed.split(/[.!?]+\s+/).filter((segment) => segment.trim());
  if (/[.!?]\s*$/.test(trimmed)) {
    return segments.length;
  }

  return segments.length;
}

export function findBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const phrase of SUMMARY_BANNED_WORDS) {
    if (lower.includes(phrase)) {
      found.push(phrase);
    }
  }

  return found;
}

export type SummaryValidation = {
  sentenceCount: number;
  wordCount: number;
  bannedWords: string[];
  sentenceError: string | null;
  wordError: string | null;
};

export function validateSummary(text: string): SummaryValidation {
  const sentenceCount = countSummarySentences(text);
  const wordCount = countSummaryWords(text);
  const bannedWords = findBannedWords(text);

  const sentenceError =
    sentenceCount === SUMMARY_SENTENCE_COUNT
      ? null
      : "Summary must be exactly 4 sentences.";

  const wordError =
    wordCount >= SUMMARY_WORD_MIN && wordCount <= SUMMARY_WORD_MAX
      ? null
      : `Summary must be 70–80 words (currently ${wordCount} words).`;

  return {
    sentenceCount,
    wordCount,
    bannedWords,
    sentenceError,
    wordError,
  };
}

export function stripBannedSummaryWords(text: string): string {
  let out = text;
  const banned = [...SUMMARY_BANNED_WORDS].sort((a, b) => b.length - a.length);

  for (const phrase of banned) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}s?\\b`, "gi");
    out = out.replace(pattern, (match) => {
      const lower = match.toLowerCase();
      if (lower.startsWith("leverag")) return "applies";
      if (lower.startsWith("utiliz")) return "uses";
      if (lower.startsWith("facilitat")) return "enables";
      return "";
    });
  }

  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}
