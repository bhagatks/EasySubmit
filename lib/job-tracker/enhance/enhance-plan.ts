import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JobIntelligence, WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import { findBannedWords, validateSummary } from "@/lib/resume/summary-rules";
import {
  findBannedSkills,
  parseSkillsText,
  validateSkillsSystem,
} from "@/lib/resume/skills-rules";

export type EnhancePlan = {
  /** JD Brain must-haves not already on the resume — never raw keyword-gap tokens. */
  skillsToAdd: string[];
  /** Engineering-only skills to drop for non-tech target roles. */
  skillsToRemove: string[];
  weakBullets: WeakBulletTarget[];
  structuralWarnings: string[];
  summaryWarnings: string[];
  skillsWarnings: string[];
};

function buildSummaryWarnings(summaryText: string): string[] {
  if (!summaryText.trim()) return [];

  const validation = validateSummary(summaryText);
  const warnings: string[] = [];

  if (validation.sentenceError) {
    warnings.push(
      `Summary should be exactly 4 sentences (currently ${validation.sentenceCount}).`,
    );
  }
  if (validation.wordError) {
    warnings.push(
      `Summary should be 70–80 words (currently ${validation.wordCount} words).`,
    );
  }
  if (validation.bannedWords.length > 0) {
    warnings.push(
      `Summary contains overused phrases: ${validation.bannedWords.join(", ")}. Replace with specific, quantified language.`,
    );
  }

  return warnings;
}

function buildSkillsWarnings(skills: string[]): string[] {
  const warnings: string[] = [];
  const banned = findBannedSkills(skills);

  if (banned.length > 0) {
    warnings.push(
      `Skills section contains generic terms that reduce ATS score: ${banned.join(", ")}. Replace with specific tools or technologies.`,
    );
  }

  const validation = validateSkillsSystem(skills);
  if (validation.countWarning) warnings.push(validation.countWarning);
  if (validation.compositionWarning) warnings.push(validation.compositionWarning);

  return warnings;
}

/** Merge JD Brain directive + resume ATS signals into one deterministic plan. */
export function buildEnhancePlan(
  form: HubRefineryForm,
  jobIntelligence: JobIntelligence,
  directive?: ResumeEnhanceDirective,
): EnhancePlan {
  const skills = parseSkillsText(form.skillsText ?? "");
  const summaryText = form.professionalSummary?.trim() ?? "";

  return {
    skillsToAdd: directive?.mustAddSkills ?? [],
    skillsToRemove: directive?.mustRemoveSkills ?? [],
    weakBullets: jobIntelligence.weakBullets,
    structuralWarnings: jobIntelligence.structuralWarnings,
    summaryWarnings: buildSummaryWarnings(summaryText),
    skillsWarnings: buildSkillsWarnings(skills),
  };
}
