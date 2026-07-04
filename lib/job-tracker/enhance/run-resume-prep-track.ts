/**
 * Resume track — load profile, rules, slim experience context. No JD reads.
 */

import {
  buildExperiencePromptContext,
  experienceSourceBlob,
} from "@/lib/job-tracker/enhance/build-experience-prompt-context";
import type {
  ResumePrepBundle,
  RunResumePrepTrackInput,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import {
  pipelineDebugAdvance,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";
import { profileLoadArtifacts } from "@/lib/extension/pipeline-debug-artifact-builders";
import { resolveSourceProfileForJob } from "@/lib/profile/copy-profile-for-job";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { findBannedSkills, parseSkillsText, validateSkillsSystem } from "@/lib/resume/skills-rules";
import { validateSummary } from "@/lib/resume/summary-rules";
import { findEmbeddedExperienceHeaderInBullet } from "@/lib/resume/split-mashed-experience";
import {
  estimateYearsExperience,
  inferResumePagesFromForm,
} from "@/src/lib/ai/engine/candidate-context";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

function countMashedRoles(form: ResumePrepBundle["form"]): number {
  let count = 0;
  for (const exp of form.experience ?? []) {
    for (const line of (exp.bullets ?? "").split("\n")) {
      if (findEmbeddedExperienceHeaderInBullet(line.trim())) count++;
    }
  }
  return count;
}

function inferSeniority(targetRole: string, years: number): string {
  const role = targetRole.toLowerCase();
  if (/\b(director|vp|vice president|head of|chief|c-suite|executive)\b/.test(role)) {
    return "executive";
  }
  if (/\b(principal|staff|lead|manager|director)\b/.test(role) || years >= 10) {
    return "senior";
  }
  if (years >= 5) return "mid";
  return "early";
}

export async function runResumePrepTrack(
  input: RunResumePrepTrackInput,
): Promise<ResumePrepBundle> {
  const debug = input.pipelineDebug ?? null;

  pipelineDebugAdvance(debug, "profile_load");

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_START,
    phase: "start",
    level: "high",
    event: "resume_track.start",
    scope: "server",
    userId: input.userId,
    params: { jobEntryId: input.jobEntryId },
  });

  let form = input.form;
  let sourceProfileId = input.sourceProfileId ?? "";
  let profileTargetTitle = input.profileTargetTitle ?? "";
  let profileUpdatedAt: string | null = null;

  if (!form) {
    const source = await resolveSourceProfileForJob(input.userId, input.sourceProfileId);
    if (!source) {
      pipelineDebugStep(debug, "profile_load", {
        status: "error",
        detail: "No resume profile to tailor from",
      });
      throw new Error("No resume profile to tailor from");
    }
    form = hubRefineryFormFromProfile(source);
    sourceProfileId = source.id;
    profileTargetTitle = targetTitleFromProfile(source);
    profileUpdatedAt =
      source.updatedAt instanceof Date
        ? source.updatedAt.toISOString()
        : source.updatedAt
          ? String(source.updatedAt)
          : null;

    pipelineDebugStep(debug, "profile_load", {
      status: "done",
      detail:
        [source.firstName, source.lastName].filter(Boolean).join(" ").trim() || source.id,
      meta: {
        sourceProfileId: source.id,
        targetTitle: profileTargetTitle,
        experienceCount: form.experience.filter((e) => !e.hidden).length,
        skillsCount: (form.skillsText ?? "").split(",").filter(Boolean).length,
      },
      artifacts: profileLoadArtifacts(form, source),
    });
  } else {
    pipelineDebugStep(debug, "profile_load", {
      status: "done",
      detail: "Form provided",
      meta: { sourceProfileId: sourceProfileId || null },
    });
  }

  pipelineDebugAdvance(debug, "pre_rules", "profile_load");

  const skillsList = parseSkillsText(form.skillsText ?? "");
  const summaryText = form.professionalSummary?.trim() ?? "";
  const summaryValidation = validateSummary(summaryText);
  const skillsValidation = validateSkillsSystem(skillsList);
  const banned = findBannedSkills(skillsList);
  const pages = inferResumePagesFromForm(form, input.targetRole);
  const years = estimateYearsExperience(form);
  const promptExperience = buildExperiencePromptContext(form.experience ?? [], pages);

  const summaryWarnings = [
    ...(summaryValidation.sentenceError ? [summaryValidation.sentenceError] : []),
    ...(summaryValidation.wordError ? [summaryValidation.wordError] : []),
    ...(summaryValidation.bannedWords.length
      ? [`Banned words: ${summaryValidation.bannedWords.join(", ")}`]
      : []),
  ];

  pipelineDebugStep(debug, "pre_rules", {
    status: summaryWarnings.length > 0 ? "warning" : "done",
    detail:
      summaryWarnings.length > 0 ? "Summary rules flagged" : "Summary + skills rules OK",
    meta: {
      summarySentences: summaryValidation.sentenceCount,
      summaryWords: summaryValidation.wordCount,
      skillsCount: skillsList.length,
    },
  });

  pipelineDebugStep(debug, "pre_resume_context", {
    status: "done",
    detail: `Slim experience · ${pages} page budget · ${years}y`,
    meta: {
      pageBudget: pages,
      yearsExperience: years,
      experienceRoles: (form.experience ?? []).filter((e) => !e.hidden).length,
    },
  });

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_READY,
    phase: "done",
    level: "high",
    event: "resume_track.done",
    scope: "server",
    userId: input.userId,
    params: {
      skillsCount: skillsList.length,
      pageBudget: pages,
      yearsExperience: years,
    },
  });

  return {
    form,
    sourceProfileId,
    profileTargetTitle,
    skillsList,
    summaryText,
    pageBudget: pages,
    yearsExperience: years,
    senioritySignal: inferSeniority(input.targetRole, years),
    promptExperience,
    experienceSourceBlob: experienceSourceBlob(form.experience ?? []),
    summaryValidation: {
      valid: !summaryValidation.sentenceError && !summaryValidation.wordError,
      sentenceCount: summaryValidation.sentenceCount,
      wordCount: summaryValidation.wordCount,
      bannedWords: summaryValidation.bannedWords,
      warnings: summaryWarnings,
    },
    skillsValidation: {
      compositionOk: !skillsValidation.compositionWarning,
      banned,
    },
    mashedRolesFound: countMashedRoles(form),
    experienceEntryCount: (form.experience ?? []).filter((e) => !e.hidden).length,
    profileUpdatedAt,
  };
}
