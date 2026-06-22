/**
 * Build rich template placeholders from tailor form + parser context.
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { CoverLetterTemplatePlaceholders } from "@/lib/job-tracker/cover-letter-template-matrix";
import type { JobContext, ResumeContext } from "@/lib/job-tracker/extract-job-resume-context";
import {
  JOB_CONTEXT_FALLBACKS,
  RESUME_CONTEXT_FALLBACKS,
} from "@/lib/job-tracker/extract-job-resume-context";

const METRIC_BULLET_PATTERN = /\d|%|(?<!\w)(million|billion|thousand)(?!\w)/i;

export function firstVisibleExperienceEntry(form: HubRefineryForm) {
  return form.experience.find(
    (entry) => !entry.hidden && (entry.title?.trim() || entry.company?.trim()),
  );
}

function capitalizeKeyword(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function firstAchievementLine(form: HubRefineryForm): string {
  for (const entry of form.experience) {
    if (entry.hidden) continue;
    for (const line of entry.bullets?.split("\n") ?? []) {
      const bullet = line.replace(/^[-•*]\s*/, "").trim();
      if (bullet && METRIC_BULLET_PATTERN.test(bullet)) {
        return bullet.endsWith(".") ? bullet : `${bullet}.`;
      }
    }
  }
  return "I have a consistent record of shipping dependable work with clear ownership and measurable results.";
}

function summarySnippet(form: HubRefineryForm): string {
  const summary = form.professionalSummary?.trim();
  if (!summary) {
    return "I bring a steady, hands-on approach to complex technical work.";
  }
  const sentence = summary.split(/(?<=[.!?])\s+/)[0]?.trim() ?? summary;
  if (sentence.length > 220) {
    const truncated = sentence.slice(0, 217);
    const lastSpace = truncated.lastIndexOf(" ");
    const cutPoint = lastSpace > 150 ? lastSpace : 217;
    return truncated.slice(0, cutPoint).trim() + "...";
  }
  return sentence;
}

function priorCompanyFromForm(form: HubRefineryForm): string {
  return firstVisibleExperienceEntry(form)?.company?.trim() || "my recent employer";
}

export function buildTailorPlaceholders(input: {
  form: HubRefineryForm;
  resumeData: ResumeContext;
  jdData: JobContext;
}): CoverLetterTemplatePlaceholders {
  const skills = input.resumeData.topSkills.value;
  const keywords = input.jdData.topKeywords.value;

  const topSkill =
    skills[0]?.trim() ||
    (keywords[0] ? capitalizeKeyword(keywords[0]) : "core technical work");
  const secondSkill = skills[1]?.trim() || "cross-functional delivery";
  const thirdSkill = skills[2]?.trim() || "operational reliability";

  const jdKeyword = keywords[0]
    ? capitalizeKeyword(keywords[0])
    : topSkill;
  const jdKeyword2 = keywords[1]
    ? capitalizeKeyword(keywords[1])
    : secondSkill;

  return {
    company:
      input.jdData.companyName.value.trim() || JOB_CONTEXT_FALLBACKS.companyName,
    targetTitle:
      input.jdData.targetJobTitle.value.trim() ||
      JOB_CONTEXT_FALLBACKS.targetJobTitle,
    topSkill,
    secondSkill,
    thirdSkill,
    priorTitle:
      input.resumeData.mostRecentJobTitle.value.trim() ||
      RESUME_CONTEXT_FALLBACKS.mostRecentJobTitle,
    priorCompany: priorCompanyFromForm(input.form),
    jdKeyword,
    jdKeyword2,
    achievementLine: firstAchievementLine(input.form),
    summarySnippet: summarySnippet(input.form),
  };
}
