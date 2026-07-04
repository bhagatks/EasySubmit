/**
 * Job track — JD skills, JD brain, optional JD AI extract. No profile reads.
 */

import {
  detectPlatform,
  getPlatformRules,
  resolvePlatformStrategy,
  type AtsPlatform,
} from "@/lib/job-tracker/ats/platform-rules";
import { buildPlatformStrategyInstructionBlock } from "@/lib/job-tracker/ats/platform-strategy-instructions";
import { analyzeJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import {
  makeEmptyIntelligence,
  type JDIntelligence,
} from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import { emptyJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import { fetchJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-service";
import { hasFullJd } from "@/lib/job-tracker/enhance/max-ats-helpers";
import type {
  JobAnalysisBundle,
  RunJobAnalysisTrackInput,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import {
  pipelineDebugAdvance,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";
import { dataArtifact, externalApiArtifactsFromExchanges } from "@/lib/extension/pipeline-debug-sanitize";
import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";
import { prisma } from "@/lib/prisma";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { resolveQuotaRowWithReset } from "@/src/lib/ai/engine/system-quota-gate";
import { getAppConfig } from "@/src/lib/services/config-service";
import { resolveAiUpgrade } from "@/lib/job-tracker/enhance/resolve-ai-upgrade";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
async function loadJdCaches(jobEntryId: string): Promise<{
  jdIntelligence: JDIntelligence | null;
  jdHash: string | null;
  jdSkillsVocabulary: JdSkillsVocabulary | null;
  jdSkillsHash: string | null;
  atsPlatform: AtsPlatform;
}> {
  const entry = await prisma.jobTrackerEntry.findUnique({
    where: { id: jobEntryId },
    select: {
      jdIntelligence: true,
      jdDescriptionHash: true,
      jdSkillsVocabulary: true,
      jdSkillsHash: true,
      canonicalUrl: true,
      platform: true,
    },
  });

  return {
    jdIntelligence: (entry?.jdIntelligence as JDIntelligence | null) ?? null,
    jdHash: entry?.jdDescriptionHash ?? null,
    jdSkillsVocabulary: (entry?.jdSkillsVocabulary as JdSkillsVocabulary | null) ?? null,
    jdSkillsHash: entry?.jdSkillsHash ?? null,
    atsPlatform: detectPlatform(entry?.canonicalUrl ?? "", entry?.platform),
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

function platformBundle(atsPlatform: AtsPlatform): JobAnalysisBundle["platform"] {
  const platformRules = getPlatformRules(atsPlatform);
  const atsStrategy = resolvePlatformStrategy(atsPlatform);
  return {
    id: atsPlatform,
    label: platformRules.label,
    strategy: atsStrategy,
    strategyInstructions: buildPlatformStrategyInstructionBlock(atsStrategy),
    tip: platformRules.tip,
  };
}

export async function runJobAnalysisTrack(
  input: RunJobAnalysisTrackInput,
): Promise<JobAnalysisBundle> {
  const debug = input.pipelineDebug ?? null;
  const trimmedJd = input.jobDescription?.trim() ?? "";
  const hasJd = hasFullJd(trimmedJd);
  const caches = await loadJdCaches(input.jobEntryId);
  const platform = platformBundle(caches.atsPlatform);

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "8",
    track: "jd",
    pipelineStep: ENHANCE_PIPELINE.PRE_JD_SKILLS,
    phase: "start",
    level: "high",
    event: "job_track.start",
    scope: "server",
    userId: input.userId,
    params: { hasJd, jobEntryId: input.jobEntryId },
  });

  if (!hasJd) {
    pipelineDebugStep(debug, "pre_jd_skills", {
      status: "skipped",
      detail: "No full JD — role/company mode",
    });
    pipelineDebugStep(debug, "pre_jd_brain", {
      status: "skipped",
      detail: "No full JD",
    });
    pipelineDebugStep(debug, "ai_jd_extract", {
      status: "skipped",
      detail: "No full JD",
    });

    return {
      descriptionHash: "",
      segments: {
        requirements: "",
        responsibilities: "",
        preferred: "",
        context: "",
        source: "full-text",
        wordCount: { requirements: 0, responsibilities: 0, preferred: 0 },
      },
      intelligence: makeEmptyIntelligence(),
      skillsVocabulary: emptyJdSkillsVocabulary(""),
      jdAiAttempted: false,
      jdAiCallCount: 0,
      jdAiSkipDetail: "No full JD",
      cacheHit: false,
      hasJd: false,
      platform,
    };
  }

  pipelineDebugAdvance(debug, "pre_jd_skills");

  const escoApiDebug: ExternalApiDebugExchange[] = [];
  const jdSkillsVocabulary = await fetchJdSkillsVocabulary({
    jobDescription: trimmedJd,
    jobTitle: input.targetRole,
    targetRole: input.targetRole,
    cachedVocabulary: caches.jdSkillsVocabulary,
    cachedHash: caches.jdSkillsHash,
    apiDebug: debug ? escoApiDebug : undefined,
  });

  const jdSkillsArtifacts = externalApiArtifactsFromExchanges(escoApiDebug);
  jdSkillsArtifacts.push(
    dataArtifact(
      "JD skills summary",
      {
        source: jdSkillsVocabulary.source,
        providers: jdSkillsVocabulary.providersUsed,
        skillsSample: jdSkillsVocabulary.skills.slice(0, 12).map((skill) => ({
          label: skill.label,
          source: skill.source,
        })),
      },
      "output",
    ),
  );

  pipelineDebugStep(debug, "pre_jd_skills", {
    status: "done",
    detail: `${jdSkillsVocabulary.skills.length} skills (${jdSkillsVocabulary.source})`,
    meta: { source: jdSkillsVocabulary.source, providers: jdSkillsVocabulary.providersUsed },
    artifacts: jdSkillsArtifacts,
  });
  pipelineDebugAdvance(debug, "pre_jd_brain", "pre_jd_skills");

  let aiRoute = input.aiRoute ?? null;
  let quotaUser = input.quotaUser ?? null;
  if (!aiRoute) {
    const user =
      quotaUser ??
      (await prisma.user.findUnique({
        where: { id: input.userId },
        select: SYSTEM_QUOTA_USER_SELECT,
      }));
    if (user) {
      quotaUser = user;
      const aiUpgrade = await resolveAiUpgrade(user, "extension", {
        traceId: input.traceId,
      });
      aiRoute = aiUpgrade.route ?? null;
    }
  }

  const aiEngine = aiRoute ? await getAppConfig("aiEngine") : null;
  const quotaContext =
    quotaUser && aiEngine
      ? {
          quotaRow: resolveQuotaRowWithReset(quotaUser).quotaRow,
          aiEngine,
        }
      : undefined;

  const jdResult = await analyzeJobDescription({
    rawDescription: trimmedJd,
    targetRole: input.targetRole,
    cachedIntelligence: caches.jdIntelligence,
    cachedHash: caches.jdHash,
    aiRoute,
    jobEntryId: input.jobEntryId,
    jdExtraction: quotaContext
      ? { quotaContext, pipelineDebug: debug }
      : debug
        ? { pipelineDebug: debug }
        : undefined,
    traceId: input.traceId,
    userId: input.userId,
  });

  logEnhance("server", "job_track.jd_brain.done", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_JD_BRAIN,
    cacheHit: jdResult.cacheHit,
    aiCallMade: jdResult.aiCallMade,
    aiAttempted: jdResult.aiAttempted,
  });

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

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "8",
    track: "jd",
    pipelineStep: ENHANCE_PIPELINE.PRE_JD_BRAIN,
    phase: "done",
    level: "high",
    event: "job_track.done",
    scope: "server",
    userId: input.userId,
    flags: {
      jdCacheHit: jdResult.cacheHit,
      jdAiCallMade: jdResult.aiCallMade,
    },
    params: {
      mustHaveSkills: jdResult.intelligence.mustHaveSkills.length,
      tier1Count: jdResult.intelligence.tier1Keywords.length,
    },
  });

  return {
    descriptionHash: jdResult.descriptionHash,
    segments: jdResult.segments,
    intelligence: jdResult.intelligence,
    skillsVocabulary: jdSkillsVocabulary,
    jdAiAttempted: jdResult.aiAttempted,
    jdAiCallCount: jdResult.aiCallMade ? 1 : 0,
    jdAiSkipDetail: jdResult.aiSkipDetail ?? null,
    cacheHit: jdResult.cacheHit,
    hasJd: true,
    platform,
  };
}
