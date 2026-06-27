import type { EnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";
import { buildBaselineChangeSummary } from "@/lib/job-tracker/enhance/build-baseline-change-summary";
import {
  cleanExperienceBullets,
  mergeSkills,
  removeSkills,
  rewriteWeakBullets,
} from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";
import type { DeterministicEnhanceResult } from "@/lib/job-tracker/ats/deterministic-enhancer";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildDeterministicSummary } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { taperExperienceEntries } from "@/lib/resume/experience-bullet-rules";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";

/** Apply an EnhancePlan without AI — legacy wrapper; prefer applyBaselineEnhance. */
export function applyEnhancePlan(
  form: HubRefineryForm,
  plan: EnhancePlan,
): DeterministicEnhanceResult {
  let updatedForm = splitMashedExperienceInForm({ ...form });
  const preInjectionSkills = parseSkillsText(updatedForm.skillsText ?? "");
  const skillsAdded: string[] = [];

  if (plan.skillsToRemove.length > 0) {
    const removed = removeSkills(updatedForm.skillsText ?? "", plan.skillsToRemove);
    if (removed !== (updatedForm.skillsText ?? "")) {
      updatedForm = { ...updatedForm, skillsText: removed };
    }
  }

  if (plan.skillsToAdd.length > 0) {
    const newSkillsText = mergeSkills(updatedForm.skillsText ?? "", plan.skillsToAdd);
    if (newSkillsText !== (updatedForm.skillsText ?? "")) {
      const before = new Set(preInjectionSkills.map((s) => s.toLowerCase()));
      skillsAdded.push(
        ...plan.skillsToAdd.filter((s) => !before.has(s.toLowerCase())),
      );
      updatedForm = { ...updatedForm, skillsText: newSkillsText };
    }
  }

  const bulletResult = rewriteWeakBullets(updatedForm, plan.weakBullets);
  updatedForm = cleanExperienceBullets(bulletResult.form);

  const pages = inferResumePagesFromForm(updatedForm, plan.targetRole ?? "");
  const tapered = taperExperienceEntries(updatedForm.experience ?? [], pages);
  updatedForm = { ...updatedForm, experience: tapered.entries };
  const bulletsTrimmed = tapered.bulletsTrimmed;

  let summaryRewritten = false;
  if (plan.summaryWarnings.length > 0) {
    const mergedSkills = parseSkillsText(updatedForm.skillsText ?? "");
    const rewritten = buildDeterministicSummary({
      currentSummary: updatedForm.professionalSummary ?? "",
      skills: mergedSkills,
      experience: updatedForm.experience ?? [],
      targetRole: plan.targetRole ?? "",
      summaryTheme: plan.summaryTheme,
      roleLevel: plan.roleLevel,
    });
    if (rewritten !== (updatedForm.professionalSummary ?? "").trim()) {
      updatedForm = { ...updatedForm, professionalSummary: rewritten };
      summaryRewritten = true;
    }
  }

  return {
    form: updatedForm,
    summary: buildBaselineChangeSummary({
      plan,
      skillsAdded,
      bulletsRewritten: bulletResult.bulletsRewritten,
      bulletsWoven: 0,
      bulletsTrimmed,
      summaryRewritten,
    }),
    changes: {
      skillsAdded,
      bulletsRewritten: bulletResult.bulletsRewritten,
      structuralIssuesFound: plan.structuralWarnings.length,
    },
  };
}
