/**
 * Light merge — skills only. Job must-haves vs resume skills → updated skillsText.
 */

import { buildGroupedSkills } from "@/lib/job-tracker/enhance/merge-skills-grouped";
import type {
  JobAnalysisBundle,
  LightMergeResult,
  ResumePrepBundle,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import { experienceBlobFromForm } from "@/lib/job-tracker/enhance/summary-grounding";
import { splitMashedExperienceInForm } from "@/lib/resume/split-mashed-experience";
import { removeSkills } from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";

export function lightSkillsMerge(
  job: JobAnalysisBundle,
  resume: ResumePrepBundle,
  targetRole: string,
): LightMergeResult {
  const directive = buildResumeEnhanceDirective(
    job.intelligence,
    resume.skillsList,
    job.skillsVocabulary,
  );

  let form = splitMashedExperienceInForm({ ...resume.form });

  if (directive.mustRemoveSkills.length > 0) {
    form = {
      ...form,
      skillsText: removeSkills(form.skillsText ?? "", directive.mustRemoveSkills),
    };
  }

  const grouped = buildGroupedSkills({
    existingSkillsText: form.skillsText ?? "",
    jdVocabulary: job.skillsVocabulary,
    mustAddSkills: directive.mustAddSkills,
    keywordSkills: [],
    skillsToRemove: directive.mustRemoveSkills,
    form,
    targetRole,
    summaryTheme: directive.summaryTheme,
    experienceBlob: experienceBlobFromForm(form.experience ?? []),
    roleVocabulary: resume.roleVocabulary,
  });

  form = { ...form, skillsText: grouped.skillsText };

  const summaryIdentity = resolveSummaryIdentity({
    profileTargetTitle: resume.profileTargetTitle,
    form,
    currentSummary: resume.summaryText,
    jdTargetRole: targetRole,
    jdKeywords: job.hasJd
      ? [
          ...job.intelligence.tier1Keywords,
          ...job.intelligence.tier2Keywords,
          ...directive.mustAddSkills,
        ]
      : [],
    jdDomain: job.hasJd ? job.intelligence.domain : undefined,
  });

  return {
    form,
    skillsAdded: grouped.skillsAdded,
    skillsToRemove: directive.mustRemoveSkills,
    directive,
    summaryIdentity,
  };
}
