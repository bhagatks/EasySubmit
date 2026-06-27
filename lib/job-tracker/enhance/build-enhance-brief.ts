import type { FeatureSurface } from "@/lib/features/types";
import type { EnhanceResumeProfileInput } from "@/lib/ai/enhance-resume-for-user";
import { analyzeJobIntelligenceWithOnet } from "@/lib/job-tracker/ats/job-intelligence";
import { analyzeKeywordGapFromIntelligence } from "@/lib/job-tracker/ats/keyword-gap";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { fetchRoleVocabulary } from "@/lib/job-tracker/ats/onet-service";
import type { ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";
import { buildJdAtomList } from "@/lib/job-tracker/enhance/build-jd-atom-list";
import { buildJdCoverageReport } from "@/lib/job-tracker/enhance/build-jd-coverage-report";
import { scoreBulletAnchors } from "@/lib/job-tracker/enhance/score-bullet-anchors";
import { buildEnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { analyzeJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import { fetchJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-service";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";
import {
  findBannedSkills,
  parseSkillsText,
  validateSkillsSystem,
} from "@/lib/resume/skills-rules";
import { findBannedWords, validateSummary } from "@/lib/resume/summary-rules";
import { findEmbeddedExperienceHeaderInBullet } from "@/lib/resume/split-mashed-experience";
import { inferResumePagesFromForm } from "@/src/lib/ai/engine/candidate-context";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

export type BuildEnhanceBriefInput = {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  surface: FeatureSurface;
  variant: NonNullable<EnhanceResumeProfileInput["variant"]>;
  traceId: string;
  userId: string;
  /** Shared enhance AI route for JD extraction (null → deterministic JD only). */
  aiRoute?: ResolvedAiRoute | null;
};

function countMashedRoles(form: HubRefineryForm): number {
  let count = 0;
  for (const exp of form.experience ?? []) {
    for (const line of (exp.bullets ?? "").split("\n")) {
      if (findEmbeddedExperienceHeaderInBullet(line.trim())) count++;
    }
  }
  return count;
}

async function loadJdCaches(jobEntryId?: string): Promise<{
  jdIntelligence: JDIntelligence | null;
  jdHash: string | null;
  jdSkillsVocabulary: JdSkillsVocabulary | null;
  jdSkillsHash: string | null;
}> {
  if (!jobEntryId) {
    return {
      jdIntelligence: null,
      jdHash: null,
      jdSkillsVocabulary: null,
      jdSkillsHash: null,
    };
  }

  const entry = await prisma.jobTrackerEntry.findUnique({
    where: { id: jobEntryId },
    select: {
      jdIntelligence: true,
      jdDescriptionHash: true,
      jdSkillsVocabulary: true,
      jdSkillsHash: true,
    },
  });

  return {
    jdIntelligence: (entry?.jdIntelligence as JDIntelligence | null) ?? null,
    jdHash: entry?.jdDescriptionHash ?? null,
    jdSkillsVocabulary: (entry?.jdSkillsVocabulary as JdSkillsVocabulary | null) ?? null,
    jdSkillsHash: entry?.jdSkillsHash ?? null,
  };
}

function persistJdCaches(
  jobEntryId: string,
  data: {
    jdIntelligence?: JDIntelligence;
    jdDescriptionHash?: string;
    jdSkillsVocabulary?: JdSkillsVocabulary;
    jdSkillsHash?: string;
  },
): void {
  prisma.jobTrackerEntry
    .update({
      where: { id: jobEntryId },
      data: {
        ...(data.jdIntelligence ? { jdIntelligence: data.jdIntelligence as object } : {}),
        ...(data.jdDescriptionHash ? { jdDescriptionHash: data.jdDescriptionHash } : {}),
        ...(data.jdSkillsVocabulary
          ? { jdSkillsVocabulary: data.jdSkillsVocabulary as object }
          : {}),
        ...(data.jdSkillsHash ? { jdSkillsHash: data.jdSkillsHash } : {}),
        ...(data.jdIntelligence ? { jdIntelUpdatedAt: new Date() } : {}),
      },
    })
    .catch(() => undefined);
}

export async function buildEnhanceBrief(
  input: BuildEnhanceBriefInput,
): Promise<ResumeEnhanceBrief> {
  const trimmedJd = input.jobDescription?.trim() ?? "";
  const hasJd = trimmedJd.length >= 120;
  const prime = refineryFormToPrimeResume(input.form);
  const skillsList = parseSkillsText(input.form.skillsText ?? "");
  const summaryText = input.form.professionalSummary?.trim() ?? "";
  const summaryValidation = validateSummary(summaryText);
  const skillsValidation = validateSkillsSystem(skillsList);

  logEnhance("server", "pre.brief.start", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_BRIEF_START,
    hasJd,
    surface: input.surface,
  });

  const pages = inferResumePagesFromForm(input.form, input.targetRole);
  const onet = await fetchRoleVocabulary(input.targetRole);

  logEnhance("server", "pre.onet.done", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_ONET_FETCH,
    matchedTitle: onet.matchedTitle,
  });

  let jobIntelligence = await analyzeJobIntelligenceWithOnet(
    input.form,
    input.targetRole,
    hasJd ? trimmedJd : "",
  );

  const bulletQuality = analyzeBulletQuality(prime);
  const weakBullets = bulletQuality.entries.flatMap((entry, ei) =>
    entry.bullets
      .filter((b) => b.issues.length > 0)
      .map((b, bi) => ({
        experienceIndex: ei,
        bulletIndex: bi,
        bulletText: b.text,
        issues: b.issues.map((i) => i.type) as Array<"weak-verb" | "weak-phrase" | "no-metric">,
      })),
  );

  jobIntelligence = { ...jobIntelligence, weakBullets };

  let jdSlice: ResumeEnhanceBrief["jd"];

  if (hasJd) {
    const caches = await loadJdCaches(input.jobEntryId);

    const jdSkillsVocabulary = await fetchJdSkillsVocabulary({
      jobDescription: trimmedJd,
      jobTitle: input.targetRole,
      targetRole: input.targetRole,
      cachedVocabulary: caches.jdSkillsVocabulary,
      cachedHash: caches.jdSkillsHash,
    });

    logEnhance("server", "pre.jd_skills.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_SKILLS,
      skillsCount: jdSkillsVocabulary.skills.length,
      source: jdSkillsVocabulary.source,
      providers: jdSkillsVocabulary.providersUsed,
    });

    const jdResult = await analyzeJobDescription({
      rawDescription: trimmedJd,
      targetRole: input.targetRole,
      cachedIntelligence: caches.jdIntelligence,
      cachedHash: caches.jdHash,
      aiRoute: input.aiRoute ?? null,
      traceId: input.traceId,
      userId: input.userId,
    });

    const directive = buildResumeEnhanceDirective(
      jdResult.intelligence,
      prime.skills ?? [],
      jdSkillsVocabulary,
    );

    const keywordGap = analyzeKeywordGapFromIntelligence(
      prime,
      jdResult.intelligence,
      input.targetRole,
    );

    const atoms = buildJdAtomList(jdResult.intelligence, directive, jdSkillsVocabulary);
    const anchorScores = scoreBulletAnchors(input.form, atoms);
    const coverageBefore = buildJdCoverageReport({
      form: input.form,
      atoms,
      skills: skillsList,
      summary: summaryText,
    });

    if (input.jobEntryId) {
      const persist: Parameters<typeof persistJdCaches>[1] = {};
      if (!jdResult.cacheHit) {
        persist.jdIntelligence = jdResult.intelligence;
        persist.jdDescriptionHash = jdResult.descriptionHash;
      }
      if (jdSkillsVocabulary.source !== "cache") {
        persist.jdSkillsVocabulary = jdSkillsVocabulary;
        persist.jdSkillsHash = jdSkillsVocabulary.descriptionHash;
      }
      if (Object.keys(persist).length > 0) {
        persistJdCaches(input.jobEntryId, persist);
      }
    }

    jdSlice = {
      segments: jdResult.segments,
      intelligence: jdResult.intelligence,
      skillsVocabulary: jdSkillsVocabulary,
      directive,
      keywordGap,
      jobIntelligence,
      atoms,
      anchorScores,
      coverageBefore,
    };
  }

  const readiness = computeResumeReadiness(
    prime,
    input.targetRole,
    hasJd ? trimmedJd : "",
    hasJd ? jdSlice!.intelligence : undefined,
  );

  const plan = buildEnhancePlan(
    input.form,
    jobIntelligence,
    jdSlice?.directive,
    input.targetRole,
  );

  const jdSkills = hasJd && jdSlice ? jdSlice.directive.mustAddSkills.slice(0, 20) : [];

  const brief: ResumeEnhanceBrief = {
    traceId: input.traceId,
    surface: input.surface,
    variant: input.variant,
    targetRole: input.targetRole,
    hasJd,
    jobEntryId: input.jobEntryId,
    structural: {
      warnings: jobIntelligence.structuralWarnings,
      mashedRolesFound: countMashedRoles(input.form),
      experienceEntryCount: (input.form.experience ?? []).filter((e) => !e.hidden).length,
      bulletCountsByRole: (input.form.experience ?? [])
        .filter((e) => !e.hidden)
        .map((e) => (e.bullets ?? "").split("\n").filter(Boolean).length),
      pageBudget: pages,
    },
    summary: {
      text: summaryText,
      valid: !summaryValidation.sentenceError && !summaryValidation.wordError,
      warnings: [
        ...(summaryValidation.sentenceError ? [summaryValidation.sentenceError] : []),
        ...(summaryValidation.wordError ? [summaryValidation.wordError] : []),
        ...(summaryValidation.bannedWords.length
          ? [`Banned words: ${summaryValidation.bannedWords.join(", ")}`]
          : []),
      ],
      sentenceCount: summaryValidation.sentenceCount,
      wordCount: summaryValidation.wordCount,
      bannedWords: summaryValidation.bannedWords,
    },
    skills: {
      list: skillsList,
      jdSkills,
      resumeSkills: skillsList,
      warnings: plan.skillsWarnings,
      banned: findBannedSkills(skillsList),
      count: skillsList.length,
      compositionOk: !skillsValidation.compositionWarning,
    },
    experience: { weakBullets },
    jd: jdSlice,
    onet,
    readiness,
    plan,
  };

  logEnhance("server", "pre.brief.ready", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_BRIEF_READY,
    readiness: readiness.total,
    coverageBefore: jdSlice?.coverageBefore.coveragePercent ?? null,
    gapsCount: jdSlice?.coverageBefore.gaps.length ?? 0,
  });

  return brief;
}
