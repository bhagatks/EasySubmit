import type { JDSegments } from "@/lib/job-tracker/jd/jd-intelligence";

export const JD_EXTRACT_REQ_WORDS = 600;
export const JD_EXTRACT_RESP_WORDS = 400;
export const JD_EXTRACT_PREF_WORDS = 200;
export const JD_EXTRACT_CONTEXT_WORDS = 150;
export const JD_DRAFT_PROMPT_MAX_CHARS = 4000;

/** Word-boundary truncation for JD segment text sent to AI. */
export function truncateSegmentForAi(text: string, maxWords: number): string {
  const trimmed = text.trim();
  if (!trimmed || maxWords <= 0) return "";

  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function truncateSegmentsForExtraction(segments: JDSegments): {
  requirements: string;
  responsibilities: string;
  preferred: string;
  context: string;
} {
  return {
    requirements: truncateSegmentForAi(segments.requirements, JD_EXTRACT_REQ_WORDS),
    responsibilities: truncateSegmentForAi(segments.responsibilities, JD_EXTRACT_RESP_WORDS),
    preferred: truncateSegmentForAi(segments.preferred, JD_EXTRACT_PREF_WORDS),
    context: truncateSegmentForAi(segments.context, JD_EXTRACT_CONTEXT_WORDS),
  };
}

/** Pass 1 draft prompt: requirements + responsibilities only (≤4k chars). */
export function buildJdDraftPromptBlock(segments: JDSegments, maxChars = JD_DRAFT_PROMPT_MAX_CHARS): string {
  const req = segments.requirements.trim();
  const resp = segments.responsibilities.trim();
  if (!req && !resp) return "";

  const parts: string[] = [];
  if (req) parts.push(`REQUIREMENTS:\n${req}`);
  if (resp) parts.push(`RESPONSIBILITIES:\n${resp}`);

  const combined = parts.join("\n\n");
  if (combined.length <= maxChars) return combined;
  return `${combined.slice(0, maxChars - 1)}…`;
}
