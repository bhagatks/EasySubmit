import type { ResumeBodyForm } from "@/src/lib/ai/engine/candidate-context";
import { normalizeBrandTokens } from "@/lib/resume/brand-normalize";

export const FORBIDDEN_RESUME_PHRASES = [
  /\bATS\b/i,
  /keyword optimization/i,
  /match score/i,
  /keywords injected/i,
  /easysubmit/i,
];

// Common action verbs the AI prepends to bullets that already start with a verb.
// Catches: "Led lead", "Built define", "Executed provided", "Led oversee", etc.
const DOUBLE_VERB_WORDS =
  "led|managed|built|drove|executed|spearheaded|implemented|designed|delivered|developed|established|oversaw|directed|launched|created|partnered|collaborated|championed|owned|scaled|optimized|streamlined|reduced|increased|improved|ensured|supported|coordinated|facilitated|deployed|migrated|automated|integrated|transformed|enabled|aligned|defined|architected|operated|governed|analyzed|analysed|reported|identified|resolved|prioritized|mentored|hired|onboarded|coached|lead|manage|build|drive|execute|spearhead|implement|design|deliver|develop|establish|oversee|direct|launch|create|work|used|use|provide|provided|define|planned|plan|coordinate|facilitate|deploy|integrate|automate|transform|enable|align|govern|analyze|analyse|report|identify|resolve|prioritize|mentor|coach|worked|coordinated|facilitated|oversaw|supported|ensured|developed|maintained|maintained|maintain";
const DOUBLE_VERB_RE = new RegExp(
  `^(Led|Managed|Built|Drove|Executed|Spearheaded|Implemented|Designed|Delivered|Developed|Established|Oversaw|Directed|Launched|Created|Partnered|Collaborated|Championed|Owned|Scaled|Optimized|Streamlined|Reduced|Increased|Improved|Ensured|Supported|Coordinated|Facilitated|Deployed|Migrated|Automated|Integrated|Transformed|Enabled|Aligned|Defined|Architected|Operated|Governed|Analyzed|Reported|Identified|Resolved|Prioritized|Mentored|Hired|Onboarded|Coached)\\s+(${DOUBLE_VERB_WORDS})\\b`,
  "i",
);

export function cleanBulletLine(line: string): string {
  let out = normalizeBrandTokens(line.trim());
  // Fix double-verb start: keep only the first (past-tense) verb
  out = out.replace(DOUBLE_VERB_RE, "$1");
  // Fix missing space before a capital letter mid-word (e.g. "capabilitywithin" → can't fix, but "usingAgentic" → "using Agentic")
  out = out.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Fix broken hyphen with space: "full- stack" → "full-stack"
  out = out.replace(/(\w)-\s+(\w)/g, "$1-$2");
  // Collapse multiple spaces
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

export function cleanBulletsString(bullets: string): string {
  return bullets
    .split("\n")
    .map(cleanBulletLine)
    .join("\n");
}

export function stripForbiddenPhrases(text: string): string {
  let out = normalizeBrandTokens(text);
  for (const pattern of FORBIDDEN_RESUME_PHRASES) {
    out = out.replace(pattern, "");
  }
  // Fix camelCase-merged words (e.g. "usingAgentic" → "using Agentic")
  out = out.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Fix broken hyphen: "full- stack" → "full-stack"
  out = out.replace(/(\w)-\s+(\w)/g, "$1-$2");
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
  if (Array.isArray(out.experience)) {
    out.experience = out.experience.map((exp) => {
      if (exp && typeof exp === "object" && typeof (exp as Record<string, unknown>).bullets === "string") {
        return {
          ...(exp as Record<string, unknown>),
          bullets: cleanBulletsString((exp as Record<string, unknown>).bullets as string),
        };
      }
      return exp;
    }) as typeof out.experience;
  }
  return out;
}
