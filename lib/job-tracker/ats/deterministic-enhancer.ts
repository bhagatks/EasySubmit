/**
 * Deterministic Resume Enhancer — no AI, no tokens.
 *
 * When AI is unavailable (quota exhausted, API down, BYOK key invalid),
 * applies an EnhancePlan built from JD Brain + resume rules.
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import { applyEnhancePlan } from "@/lib/job-tracker/enhance/apply-enhance-plan";
import { buildEnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";

export type DeterministicEnhanceResult = {
  form: HubRefineryForm;
  /** Plain-English summary of what changed. */
  summary: string;
  /** Breakdown of changes for the UI delta card. */
  changes: {
    skillsAdded: string[];
    bulletsRewritten: number;
    structuralIssuesFound: number;
  };
};

export function deterministicEnhance(
  form: HubRefineryForm,
  intelligence: JobIntelligence,
  directive?: ResumeEnhanceDirective,
  targetRole?: string,
): DeterministicEnhanceResult {
  const plan = buildEnhancePlan(form, intelligence, directive, targetRole);
  return applyEnhancePlan(form, plan);
}
