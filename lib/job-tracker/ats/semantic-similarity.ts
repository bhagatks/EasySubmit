import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";

function termFreq(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  const len = tokens.length;
  for (const [t, count] of freq) freq.set(t, count / len);
  return freq;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [t, v] of a) {
    dot += v * (b.get(t) ?? 0);
    magA += v * v;
  }
  for (const [, v] of b) magB += v * v;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * TF cosine similarity between resume and JD text — 0 to 100.
 * Complements keyword gap (binary match) with vocabulary overlap weighted by term frequency.
 */
export function computeSemanticSimilarity(resumeText: string, jdText: string): number {
  if (!resumeText.trim() || !jdText.trim()) return 0;
  const resumeTokens = tokenizeJobText(resumeText);
  const jdTokens = tokenizeJobText(jdText);
  if (resumeTokens.length === 0 || jdTokens.length === 0) return 0;
  return Math.round(cosine(termFreq(resumeTokens), termFreq(jdTokens)) * 100);
}
