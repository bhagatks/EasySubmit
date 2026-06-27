import { analyzeJobIntelligenceWithOnet } from "@/lib/job-tracker/ats/job-intelligence";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { analyzeJobDescription, hashJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

export type EnhanceIntelligenceContext = {
  jobIntelligence?: JobIntelligence;
  enhanceDirective?: ResumeEnhanceDirective;
};

export async function buildEnhanceIntelligenceContext(input: {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  traceId: string;
  userId: string;
}): Promise<EnhanceIntelligenceContext> {
  const trimmedJd = input.jobDescription?.trim();
  const jobIntelligence = await analyzeJobIntelligenceWithOnet(
    input.form,
    input.targetRole,
    trimmedJd ?? "",
  );

  logEnhance("server", "pre.onet.done", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_ONET_FETCH,
    onetMatchedTitle: jobIntelligence.onetMatchedTitle ?? null,
    implicitSkillsCount: jobIntelligence.implicitSkillsToAdd.length,
  });

  logEnhance("server", "pre.bullet_quality.done", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_BULLET_QUALITY,
    weakBulletsCount: jobIntelligence.weakBullets.length,
  });

  if (trimmedJd) {
    logEnhance("server", "pre.keyword_gap.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_KEYWORD_GAP,
      missingKeywordsCount: jobIntelligence.missingKeywords.length,
      skillsToAdd: jobIntelligence.skillsToAdd,
      skillsToAddCount: jobIntelligence.skillsToAdd.length,
      keywordsForContentCount: jobIntelligence.keywordsForContent.length,
      coveragePercent: jobIntelligence.coveragePercent,
    });

    logEnhance("server", "pre.ats_parse.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_ATS_PARSE,
      structuralWarningsCount: jobIntelligence.structuralWarnings.length,
      structuralWarnings: jobIntelligence.structuralWarnings,
    });

    logEnhance("server", "action.intelligence", {
      traceId: input.traceId,
      step: ENHANCE_PIPELINE.SERVER_JD_INTELLIGENCE,
      userId: input.userId,
      missingKeywords: jobIntelligence.missingKeywords.length,
      skillsToAdd: jobIntelligence.skillsToAdd,
      skillsToAddCount: jobIntelligence.skillsToAdd.length,
      keywordsForContentCount: jobIntelligence.keywordsForContent.length,
      weakBulletsCount: jobIntelligence.weakBullets.length,
      coveragePercent: jobIntelligence.coveragePercent,
      onetMatchedTitle: jobIntelligence.onetMatchedTitle ?? null,
    });
  }

  let enhanceDirective: ResumeEnhanceDirective | undefined;
  if (trimmedJd) {
    let cachedIntel: JDIntelligence | null = null;
    let cachedHash: string | null = null;

    if (input.jobEntryId) {
      const entry = await prisma.jobTrackerEntry.findUnique({
        where: { id: input.jobEntryId },
        select: { jdIntelligence: true, jdDescriptionHash: true },
      });
      cachedIntel = (entry?.jdIntelligence as JDIntelligence | null) ?? null;
      cachedHash = entry?.jdDescriptionHash ?? null;
    }

    const jdResult = await analyzeJobDescription({
      rawDescription: trimmedJd,
      targetRole: input.targetRole,
      cachedIntelligence: cachedIntel,
      cachedHash,
    });

    logEnhance("server", "pre.jd_brain.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
      cacheHit: jdResult.cacheHit,
      extractedJobTitle: jdResult.intelligence.extractedJobTitle ?? null,
      domain: jdResult.intelligence.domain,
      seniority: jdResult.intelligence.seniority,
      mustHaveSkillsCount: jdResult.intelligence.mustHaveSkills.length,
      tier1Count: jdResult.intelligence.tier1Keywords.length,
      tier2Count: jdResult.intelligence.tier2Keywords.length,
    });

    if (input.jobEntryId && !jdResult.cacheHit) {
      prisma.jobTrackerEntry
        .update({
          where: { id: input.jobEntryId },
          data: {
            jdIntelligence: jdResult.intelligence as object,
            jdDescriptionHash: jdResult.descriptionHash,
            jdIntelUpdatedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    const primeData = refineryFormToPrimeResume(input.form);
    enhanceDirective = buildResumeEnhanceDirective(
      jdResult.intelligence,
      primeData.skills ?? [],
    );

    logEnhance("server", "pre.jd_directive.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_DIRECTIVE,
      mustAddSkillsCount: enhanceDirective.mustAddSkills.length,
      mustAddSkills: enhanceDirective.mustAddSkills.slice(0, 12),
      mustRemoveSkillsCount: enhanceDirective.mustRemoveSkills.length,
      mustWeaveKeywordsCount: enhanceDirective.mustWeaveKeywords.length,
      summaryTheme: enhanceDirective.summaryTheme ?? null,
      roleLevel: enhanceDirective.roleLevel,
    });

    logEnhance("server", "action.directive", {
      traceId: input.traceId,
      step: ENHANCE_PIPELINE.SERVER_JD_DIRECTIVE,
      userId: input.userId,
      cacheHit: jdResult.cacheHit,
      extractedJobTitle: jdResult.intelligence.extractedJobTitle ?? null,
      mustAddSkillsCount: enhanceDirective.mustAddSkills.length,
      mustAddSkills: enhanceDirective.mustAddSkills.slice(0, 12),
      mustWeaveKeywordsCount: enhanceDirective.mustWeaveKeywords.length,
      summaryTheme: enhanceDirective.summaryTheme ?? null,
      roleLevel: enhanceDirective.roleLevel,
    });
  }

  logEnhance("server", "pre.context.ready", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_CONTEXT_READY,
    hasJd: Boolean(trimmedJd),
    hasDirective: Boolean(enhanceDirective),
  });

  return { jobIntelligence, enhanceDirective };
}
