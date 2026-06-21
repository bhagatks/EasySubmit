import type { ResumeBodyForm } from "@/src/lib/ai/engine/candidate-context";

export const FORBIDDEN_RESUME_PHRASES = [
  /\bATS\b/i,
  /keyword optimization/i,
  /match score/i,
  /keywords injected/i,
  /easysubmit/i,
];

export function stripForbiddenPhrases(text: string): string {
  let out = text;
  for (const pattern of FORBIDDEN_RESUME_PHRASES) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeEnhancedTextFields(body: Partial<ResumeBodyForm>): Partial<ResumeBodyForm> {
  const out = { ...body };
  if (typeof out.professionalSummary === "string") {
    out.professionalSummary = stripForbiddenPhrases(out.professionalSummary);
  }
  if (typeof out.skillsText === "string") {
    out.skillsText = stripForbiddenPhrases(out.skillsText);
  }
  return out;
}
