import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";
import { buildBaselineChangeSummary } from "@/lib/job-tracker/enhance/build-baseline-change-summary";
import { buildDeterministicSummary } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { buildJdCoverageReport } from "@/lib/job-tracker/enhance/build-jd-coverage-report";
import { applyJdCoverageWeave } from "@/lib/job-tracker/enhance/jd-coverage-pack";
import { buildGroupedSkills } from "@/lib/job-tracker/enhance/merge-skills-grouped";
import {
  cleanExperienceBullets,
  removeSkills,
  rewriteWeakBullets,
} from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import { taperExperienceEntries } from "@/lib/resume/experience-bullet-rules";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";
import {
  postProcessProfessionalSummary,
  postProcessSkillsText,
} from "@/src/lib/ai/engine/post-process";

export type BaselineEnhanceResult = {
  form: HubRefineryForm;
  changes: {
    skillsAdded: string[];
    bulletsRewritten: number;
    bulletsWoven: number;
    bulletsTrimmed: number;
    summaryRewritten: boolean;
  };
  coverageAfter?: ReturnType<typeof buildJdCoverageReport>;
  enhanceSummary: string;
};

export function applyBaselineEnhance(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
  traceId: string,
  userId: string,
): BaselineEnhanceResult {
  const plan = brief.plan;
  let updatedForm = splitMashedExperienceInForm({ ...form });

  if (plan.skillsToRemove.length > 0) {
    updatedForm = {
      ...updatedForm,
      skillsText: removeSkills(updatedForm.skillsText ?? "", plan.skillsToRemove),
    };
  }

  const groupedResult = buildGroupedSkills({
    existingSkillsText: updatedForm.skillsText ?? "",
    jdVocabulary: brief.jd?.skillsVocabulary ?? {
      skills: [],
      descriptionHash: "",
      source: "fallback",
      providersUsed: ["deterministic"],
    },
    mustAddSkills: plan.skillsToAdd,
    keywordSkills: brief.jd?.jobIntelligence.skillsToAdd ?? [],
    skillsToRemove: plan.skillsToRemove,
    form: updatedForm,
    targetRole: brief.targetRole,
    onet: brief.onet,
    summaryTheme: brief.jd?.directive.summaryTheme,
  });

  updatedForm = { ...updatedForm, skillsText: groupedResult.skillsText };

  const bulletResult = rewriteWeakBullets(updatedForm, plan.weakBullets);
  updatedForm = cleanExperienceBullets(bulletResult.form);

  const weaveResult = applyJdCoverageWeave(updatedForm, brief);
  updatedForm = weaveResult.form;

  const pages = inferResumePagesFromForm(updatedForm, brief.targetRole);
  const tapered = taperExperienceEntries(updatedForm.experience ?? [], pages);
  updatedForm = { ...updatedForm, experience: tapered.entries };

  let summaryRewritten = false;
  if (plan.summaryWarnings.length > 0) {
    const mergedSkills = parseSkillsText(updatedForm.skillsText ?? "");
    const rewritten = buildDeterministicSummary({
      currentSummary: updatedForm.professionalSummary ?? "",
      skills: mergedSkills,
      experience: updatedForm.experience ?? [],
      targetRole: brief.targetRole,
      summaryTheme: plan.summaryTheme,
      roleLevel: plan.roleLevel,
    });
    if (rewritten !== (updatedForm.professionalSummary ?? "").trim()) {
      updatedForm = { ...updatedForm, professionalSummary: rewritten };
      summaryRewritten = true;
    }
  }

  updatedForm = {
    ...updatedForm,
    professionalSummary: postProcessProfessionalSummary(
      updatedForm.professionalSummary ?? "",
      traceId,
      userId,
    ),
    skillsText: postProcessSkillsText(updatedForm.skillsText ?? "", traceId, userId),
  };

  let coverageAfter: ReturnType<typeof buildJdCoverageReport> | undefined;
  if (brief.jd) {
    coverageAfter = buildJdCoverageReport({
      form: updatedForm,
      atoms: brief.jd.atoms,
      skills: parseSkillsText(updatedForm.skillsText ?? ""),
      summary: updatedForm.professionalSummary,
    });
  }

  const enhanceSummary = buildBaselineChangeSummary({
    plan,
    skillsAdded: groupedResult.skillsAdded,
    bulletsRewritten: bulletResult.bulletsRewritten,
    bulletsWoven: weaveResult.bulletsWoven,
    bulletsTrimmed: tapered.bulletsTrimmed,
    summaryRewritten,
  });

  return {
    form: updatedForm,
    changes: {
      skillsAdded: groupedResult.skillsAdded,
      bulletsRewritten: bulletResult.bulletsRewritten,
      bulletsWoven: weaveResult.bulletsWoven,
      bulletsTrimmed: tapered.bulletsTrimmed,
      summaryRewritten,
    },
    coverageAfter,
    enhanceSummary,
  };
}
