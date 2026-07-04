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
import {
  experienceBlobFromForm,
  normalizeExperienceDateFields,
  postProcessSummaryOutput,
} from "@/lib/job-tracker/enhance/summary-grounding";
import { shouldRebuildCrossDomainSummary } from "@/lib/job-tracker/enhance/cross-domain-summary";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import { taperExperienceEntries } from "@/lib/resume/experience-bullet-rules";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";
import {
  postProcessProfessionalSummary,
  postProcessSkillsText,
} from "@/src/lib/ai/engine/post-process";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

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
  coherenceWarnings: string[];
};

export type BaselineEnhanceMode = "full" | "skills_only";

export type BaselineEnhanceOptions = {
  mode?: BaselineEnhanceMode;
};

export function applyBaselineEnhance(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
  traceId: string,
  userId: string,
  options: BaselineEnhanceOptions = {},
): BaselineEnhanceResult {
  const mode = options.mode ?? "full";
  const skillsOnly = mode === "skills_only";
  logEnhanceDiag({
    traceId,
    designStep: "11",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.BASELINE_START,
    phase: "start",
    level: "high",
    event: "baseline.start",
    scope: "server",
    userId,
    params: {
      mode,
      isCrossDomain: brief.summaryIdentity.isCrossDomain,
      skillsToAdd: brief.plan.skillsToAdd.length,
      weakBullets: brief.experience.weakBullets.length,
    },
  });

  const plan = brief.plan;
  const coherenceWarnings: string[] = [];
  const resumeNativeSkills = parseSkillsText(form.skillsText ?? "");
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
    summaryTheme: brief.jd?.directive.summaryTheme,
    experienceBlob: experienceBlobFromForm(updatedForm.experience ?? []),
    isCrossDomain: brief.summaryIdentity.isCrossDomain,
  });

  updatedForm = { ...updatedForm, skillsText: groupedResult.skillsText };

  let bulletResult = { form: updatedForm, bulletsRewritten: 0 };
  let weaveResult = { form: updatedForm, bulletsWoven: 0 };
  let tapered = { entries: updatedForm.experience ?? [], bulletsTrimmed: 0 };
  let summaryRewritten = false;

  if (!skillsOnly) {
    bulletResult = rewriteWeakBullets(updatedForm, plan.weakBullets, brief.jd?.intelligence.domain);
    updatedForm = cleanExperienceBullets(bulletResult.form);

    weaveResult = applyJdCoverageWeave(updatedForm, brief);
    updatedForm = weaveResult.form;

    updatedForm = {
      ...updatedForm,
      experience: normalizeExperienceDateFields(updatedForm.experience ?? []),
    };

    const pages = inferResumePagesFromForm(updatedForm, brief.targetRole);
    tapered = taperExperienceEntries(updatedForm.experience ?? [], pages);
    updatedForm = { ...updatedForm, experience: tapered.entries };

    const mergedSkills = parseSkillsText(updatedForm.skillsText ?? "");
    const needsSummaryRewrite =
      brief.summaryIdentity.isCrossDomain
        ? shouldRebuildCrossDomainSummary(
            updatedForm.professionalSummary ?? "",
            resumeNativeSkills,
            groupedResult.grouped.jdSkills,
            (form.experience ?? []).map((e) => e.company?.trim()).filter(Boolean) as string[],
          )
        : plan.summaryWarnings.length > 0;

    if (needsSummaryRewrite) {
      const skillsForSummary = brief.summaryIdentity.isCrossDomain
        ? resumeNativeSkills
        : mergedSkills;
      const rewritten = buildDeterministicSummary({
        currentSummary: updatedForm.professionalSummary ?? "",
        skills: skillsForSummary,
        experience: updatedForm.experience ?? [],
        summaryIdentity: brief.summaryIdentity.identity,
        summaryTheme: brief.summaryIdentity.isCrossDomain ? undefined : plan.summaryTheme,
        roleLevel: plan.roleLevel,
        isTechnicalCandidate: brief.summaryIdentity.isTechnicalCandidate,
        isCrossDomain: brief.summaryIdentity.isCrossDomain,
      });
      if (rewritten !== (updatedForm.professionalSummary ?? "").trim()) {
        updatedForm = { ...updatedForm, professionalSummary: rewritten };
        summaryRewritten = true;
      }
    }
  } else {
    updatedForm = {
      ...updatedForm,
      skillsText: postProcessSkillsText(updatedForm.skillsText ?? "", traceId, userId),
    };
  }

  if (!skillsOnly) {
    const experienceBlob = experienceBlobFromForm(updatedForm.experience ?? []);
    const employerNames = (updatedForm.experience ?? [])
      .map((e) => e.company?.trim())
      .filter(Boolean) as string[];
    const summaryProcessed = postProcessSummaryOutput(
      postProcessProfessionalSummary(
        updatedForm.professionalSummary ?? "",
        traceId,
        userId,
      ),
      {
        identity: brief.summaryIdentity,
        experienceBlob,
        employerNames,
      },
    );
    updatedForm = {
      ...updatedForm,
      professionalSummary: summaryProcessed.summary,
      skillsText: postProcessSkillsText(updatedForm.skillsText ?? "", traceId, userId),
    };
    coherenceWarnings.push(...summaryProcessed.warnings);
  }

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

  logEnhanceDiag({
    traceId,
    designStep: "11",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.BASELINE_DONE,
    phase: "done",
    level: "high",
    event: "baseline.done",
    scope: "server",
    userId,
    params: {
      skillsAdded: groupedResult.skillsAdded.length,
      bulletsRewritten: bulletResult.bulletsRewritten,
      bulletsWoven: weaveResult.bulletsWoven,
      summaryRewritten,
      coverageAfter: coverageAfter?.coveragePercent ?? null,
      coherenceWarnings: coherenceWarnings.length,
    },
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
    coherenceWarnings,
  };
}
