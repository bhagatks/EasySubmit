import type { FeatureSurface } from "@/lib/features/types";
import type { EnhanceResumeProfileInput } from "@/lib/ai/enhance-resume-for-user";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import { analyzeKeywordGapFromIntelligence } from "@/lib/job-tracker/ats/keyword-gap";
import {
  detectPlatform,
  getPlatformRules,
  resolvePlatformStrategy,
  type AtsPlatform,
} from "@/lib/job-tracker/ats/platform-rules";
import { buildPlatformStrategyInstructionBlock } from "@/lib/job-tracker/ats/platform-strategy-instructions";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { computeResumeReadinessV2 } from "@/lib/resume/v2/resume-readiness-score";
import { resolveFeature } from "@/lib/features";
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
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { resolveQuotaRowWithReset, type SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";
import { getAppConfig } from "@/src/lib/services/config-service";
import { resolveSummaryIdentity } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import {
  pipelineDebugAdvance,
  pipelineDebugStep,
  type PipelineDebugHookContext,
} from "@/lib/extension/pipeline-debug-hooks";
import { dataArtifact, externalApiArtifactsFromExchanges } from "@/lib/extension/pipeline-debug-sanitize";
import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";

export type BuildEnhanceBriefInput = {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  surface: FeatureSurface;
  variant: NonNullable<EnhanceResumeProfileInput["variant"]>;
  traceId: string;
  userId: string;
  /** User row for JD extract quota pre-check (optional — skips when absent). */
  quotaUser?: SystemQuotaUserRow | null;
  /** Shared enhance AI route for JD extraction (null → deterministic JD only). */
  aiRoute?: ResolvedAiRoute | null;
  /** Temporary QA overlay — live step updates during extension Apply. */
  pipelineDebug?: PipelineDebugHookContext;
  /** User profile target title — identity anchor (not JD job title). */
  profileTargetTitle?: string;
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
  atsPlatform: AtsPlatform;
}> {
  if (!jobEntryId) {
    return {
      jdIntelligence: null,
      jdHash: null,
      jdSkillsVocabulary: null,
      jdSkillsHash: null,
      atsPlatform: "unknown",
    };
  }

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

export async function buildEnhanceBrief(
  input: BuildEnhanceBriefInput,
): Promise<ResumeEnhanceBrief> {
  const trimmedJd = input.jobDescription?.trim() ?? "";
  const hasJd = trimmedJd.length >= 120;
  const debug = input.pipelineDebug ?? null;
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

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_START,
    phase: "start",
    level: "high",
    event: "brief.start",
    scope: "server",
    userId: input.userId,
    surface: input.surface,
    variant: input.variant,
    params: {
      hasJd,
      targetRole: input.targetRole,
      jobDescriptionChars: trimmedJd.length,
      summaryValid: !summaryValidation.sentenceError && !summaryValidation.wordError,
      skillsCount: skillsList.length,
    },
  });

  const pages = inferResumePagesFromForm(input.form, input.targetRole);

  let atsPlatform: AtsPlatform = "unknown";
  let jdCaches: Awaited<ReturnType<typeof loadJdCaches>> | null = null;
  if (input.jobEntryId) {
    jdCaches = await loadJdCaches(input.jobEntryId);
    atsPlatform = jdCaches.atsPlatform;
  }
  const platformRules = getPlatformRules(atsPlatform);
  const atsStrategy = resolvePlatformStrategy(atsPlatform);
  const strategyInstructions = buildPlatformStrategyInstructionBlock(atsStrategy);

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_START,
    phase: "done",
    level: "low",
    event: "brief.platform",
    scope: "server",
    userId: input.userId,
    params: {
      atsPlatform,
      atsStrategy,
      platformLabel: platformRules.label,
    },
  });

  let jobIntelligence = analyzeJobIntelligence(
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

  pipelineDebugStep(debug, "pre_intelligence", {
    status: "done",
    detail: `${weakBullets.length} weak bullets · ${jobIntelligence.coveragePercent}% coverage`,
    meta: {
      weakBulletCount: weakBullets.length,
      structuralWarnings: jobIntelligence.structuralWarnings.length,
    },
    artifacts: [
      dataArtifact("Job intelligence", {
        coveragePercent: jobIntelligence.coveragePercent,
        structuralWarnings: jobIntelligence.structuralWarnings.slice(0, 12),
        weakBulletsSample: weakBullets.slice(0, 5).map((b) => ({
          issues: b.issues,
          bulletPreview: b.bulletText.slice(0, 120),
        })),
      }, "output"),
    ],
  });

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "6",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BULLET_QUALITY,
    phase: "done",
    level: "low",
    event: "brief.bullet_quality",
    scope: "server",
    userId: input.userId,
    params: {
      weakBulletCount: weakBullets.length,
      structuralWarnings: jobIntelligence.structuralWarnings.length,
    },
  });

  let jdSlice: ResumeEnhanceBrief["jd"];
  let jdAiCallCount = 0;
  let jdAiAttempted = false;
  let jdAiSkipDetail: string | null = null;

  if (hasJd) {
    pipelineDebugAdvance(debug, "pre_jd_skills", "pre_intelligence");
    const caches = jdCaches ?? (await loadJdCaches(input.jobEntryId));
    atsPlatform = caches.atsPlatform;
    const aiEngine = input.aiRoute ? await getAppConfig("aiEngine") : null;
    const quotaContext =
      input.quotaUser && aiEngine
        ? {
            quotaRow: resolveQuotaRowWithReset(input.quotaUser).quotaRow,
            aiEngine,
          }
        : undefined;

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
    if (jdSkillsVocabulary.source === "cache") {
      jdSkillsArtifacts.push(
        dataArtifact(
          "JD skills source",
          { source: "cache", descriptionHash: jdSkillsVocabulary.descriptionHash },
          "flags",
        ),
      );
    }
    jdSkillsArtifacts.push(
      dataArtifact(
        "JD skills summary",
        {
          source: jdSkillsVocabulary.source,
          providers: jdSkillsVocabulary.providersUsed,
          skillsSample: jdSkillsVocabulary.skills.slice(0, 12).map((skill) => ({
            label: skill.label,
            source: skill.source,
            confidence: skill.confidence,
          })),
        },
        "output",
      ),
    );

    logEnhance("server", "pre.jd_skills.done", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_SKILLS,
      skillsCount: jdSkillsVocabulary.skills.length,
      source: jdSkillsVocabulary.source,
      providers: jdSkillsVocabulary.providersUsed,
    });

    logEnhanceDiag({
      traceId: input.traceId,
      designStep: "8",
      track: "jd",
      pipelineStep: ENHANCE_PIPELINE.PRE_JD_SKILLS,
      phase: "done",
      level: "low",
      event: "brief.jd_skills",
      scope: "server",
      userId: input.userId,
      flags: {
        skillsCacheHit: jdSkillsVocabulary.source === "cache",
        aiRouteAvailable: Boolean(input.aiRoute),
      },
      params: {
        skillsCount: jdSkillsVocabulary.skills.length,
        source: jdSkillsVocabulary.source,
        providers: jdSkillsVocabulary.providersUsed,
      },
    });

    pipelineDebugStep(debug, "pre_jd_skills", {
      status: "done",
      detail: `${jdSkillsVocabulary.skills.length} skills (${jdSkillsVocabulary.source})`,
      meta: { source: jdSkillsVocabulary.source, providers: jdSkillsVocabulary.providersUsed },
      artifacts: jdSkillsArtifacts,
    });
    pipelineDebugAdvance(debug, "pre_jd_brain", "pre_jd_skills");

    const jdExtractGate = await resolveFeature({
      feature: "jdExtract",
      userId: input.userId,
      surface: input.surface,
    });

    const jdResult = await analyzeJobDescription({
      rawDescription: trimmedJd,
      targetRole: input.targetRole,
      cachedIntelligence: caches.jdIntelligence,
      cachedHash: caches.jdHash,
      aiRoute: input.aiRoute ?? null,
      shouldRunAiExtract: jdExtractGate.shouldRunAiExtract,
      jdExtraction: quotaContext
        ? { quotaContext, pipelineDebug: debug }
        : debug
          ? { pipelineDebug: debug }
          : undefined,
      traceId: input.traceId,
      userId: input.userId,
    });
    jdAiCallCount = jdResult.aiCallMade ? 1 : 0;
    jdAiAttempted = jdResult.aiAttempted;
    jdAiSkipDetail = jdResult.aiSkipDetail ?? null;

    logEnhanceDiag({
      traceId: input.traceId,
      designStep: "8",
      track: "jd",
      pipelineStep: ENHANCE_PIPELINE.PRE_JD_BRAIN,
      phase: "done",
      level: "low",
      event: "brief.jd_brain",
      scope: "server",
      userId: input.userId,
      flags: {
        jdCacheHit: jdResult.cacheHit,
        jdAiCallMade: jdResult.aiCallMade,
      },
      params: {
        domain: jdResult.intelligence.domain,
        tier1Count: jdResult.intelligence.tier1Keywords.length,
        tier2Count: jdResult.intelligence.tier2Keywords.length,
        mustHaveSkills: jdResult.intelligence.mustHaveSkills.length,
      },
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

    logEnhanceDiag({
      traceId: input.traceId,
      designStep: "4",
      track: "jd",
      pipelineStep: ENHANCE_PIPELINE.PRE_KEYWORD_GAP,
      phase: "done",
      level: "low",
      event: "brief.keyword_gap",
      scope: "server",
      userId: input.userId,
      params: {
        coveragePercent: keywordGap.coveragePercent,
        topMissing: keywordGap.topMissing.slice(0, 8),
        missingCount: keywordGap.missing.length,
      },
    });

    logEnhanceDiag({
      traceId: input.traceId,
      designStep: "10",
      track: "jd",
      pipelineStep: ENHANCE_PIPELINE.PRE_JD_DIRECTIVE,
      phase: "done",
      level: "low",
      event: "brief.directive",
      scope: "server",
      userId: input.userId,
      params: {
        mustAddSkills: directive.mustAddSkills.slice(0, 12),
        mustRemoveSkills: directive.mustRemoveSkills.slice(0, 8),
        effectiveTargetRole: directive.effectiveTargetRole,
      },
    });

    pipelineDebugAdvance(debug, "pre_keyword_gap", "pre_jd_brain");
    pipelineDebugStep(debug, "pre_keyword_gap", {
      status: "done",
      detail: `${keywordGap.coveragePercent}% keyword coverage`,
      meta: {
        coveragePercent: keywordGap.coveragePercent,
        missingCount: keywordGap.missing.length,
        topMissing: keywordGap.topMissing.slice(0, 5),
      },
      artifacts: [
        dataArtifact("Keyword gap", {
          coveragePercent: keywordGap.coveragePercent,
          topMissing: keywordGap.topMissing.slice(0, 12),
          missingSample: keywordGap.missing.slice(0, 12),
        }, "output"),
      ],
    });
    pipelineDebugAdvance(debug, "pre_directive", "pre_keyword_gap");
    pipelineDebugStep(debug, "pre_directive", {
      status: "done",
      detail: `${directive.mustAddSkills.length} must-add skills`,
      meta: {
        mustAddSkills: directive.mustAddSkills.slice(0, 8),
        effectiveTargetRole: directive.effectiveTargetRole,
      },
      artifacts: [
        dataArtifact("Enhance directive", {
          mustAddSkills: directive.mustAddSkills.slice(0, 20),
          mustRemoveSkills: directive.mustRemoveSkills.slice(0, 12),
          effectiveTargetRole: directive.effectiveTargetRole,
        }, "output"),
      ],
    });

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

  const rulesV2Resolution = await resolveFeature({
    feature: "resumeRulesV2",
    userId: input.userId,
    surface: input.surface,
    pageLengthPreference: input.form.pageLengthPreference,
  });

  const readiness = rulesV2Resolution.enabled
    ? computeResumeReadinessV2(prime, input.targetRole, hasJd ? trimmedJd : "", {
        jdIntelligence: hasJd ? jdSlice!.intelligence : undefined,
        platform: atsPlatform,
        pageMode: input.form.pageLengthPreference,
        skillsText: input.form.skillsText,
      })
    : computeResumeReadiness(
        prime,
        input.targetRole,
        hasJd ? trimmedJd : "",
        hasJd ? jdSlice!.intelligence : undefined,
        atsPlatform,
      );

  const plan = buildEnhancePlan(
    input.form,
    jobIntelligence,
    jdSlice?.directive,
    input.targetRole,
  );

  pipelineDebugStep(debug, "pre_rules", {
    status: "done",
    detail: summaryValidation.sentenceError || summaryValidation.wordError
      ? "Summary rules flagged"
      : "Summary + skills rules OK",
    meta: {
      summarySentences: summaryValidation.sentenceCount,
      summaryWords: summaryValidation.wordCount,
      skillsCount: skillsList.length,
      bannedSummaryWords: summaryValidation.bannedWords,
    },
  });
  pipelineDebugStep(debug, "pre_plan", {
    status: "done",
    detail: `Readiness ${readiness.total} · ${plan.skillsToAdd.length} skills to add`,
    meta: {
      readiness: readiness.total,
      skillsToAdd: plan.skillsToAdd.slice(0, 8),
      weakBullets: plan.weakBullets.length,
    },
    artifacts: [
      dataArtifact("Enhance plan", {
        skillsToAdd: plan.skillsToAdd.slice(0, 20),
        weakBullets: plan.weakBullets.slice(0, 8),
        readinessBreakdown: readiness.pillars,
      }, "output"),
    ],
  });

  const jdKeywords = hasJd && jdSlice
    ? [
        ...jdSlice.intelligence.tier1Keywords,
        ...jdSlice.intelligence.tier2Keywords,
        ...jdSlice.directive.mustAddSkills,
      ]
    : [];

  const summaryIdentity = resolveSummaryIdentity({
    profileTargetTitle: input.profileTargetTitle,
    form: input.form,
    currentSummary: summaryText,
    jdTargetRole: input.targetRole,
    jdKeywords,
    jdDomain: jdSlice?.intelligence.domain,
  });

  const jdSkills = hasJd && jdSlice ? jdSlice.directive.mustAddSkills.slice(0, 20) : [];

  const brief: ResumeEnhanceBrief = {
    traceId: input.traceId,
    surface: input.surface,
    variant: input.variant,
    targetRole: input.targetRole,
    hasJd,
    jobEntryId: input.jobEntryId,
    jdAiCallCount,
    jdAiAttempted,
    jdAiSkipDetail,
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
    readiness,
    plan,
    summaryIdentity,
    platform: {
      id: atsPlatform,
      label: platformRules.label,
      strategy: atsStrategy,
      strategyInstructions,
      tip: platformRules.tip,
    },
  };

  logEnhance("server", "pre.brief.ready", {
    traceId: input.traceId,
    userId: input.userId,
    step: ENHANCE_PIPELINE.PRE_BRIEF_READY,
    readiness: readiness.total,
    coverageBefore: jdSlice?.coverageBefore.coveragePercent ?? null,
    gapsCount: jdSlice?.coverageBefore.gaps.length ?? 0,
    atsPlatform,
    atsStrategy,
  });

  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_READY,
    phase: "done",
    level: "high",
    event: "brief.ready",
    scope: "server",
    userId: input.userId,
    params: {
      readiness: readiness.total,
      coverageBefore: jdSlice?.coverageBefore.coveragePercent ?? null,
      gapsCount: jdSlice?.coverageBefore.gaps.length ?? 0,
      jdAiCallCount,
      jdAiAttempted,
      isCrossDomain: summaryIdentity.isCrossDomain,
      summaryIdentity: summaryIdentity.identity,
      skillsToAdd: plan.skillsToAdd.length,
      atsPlatform,
      atsStrategy,
    },
  });

  return brief;
}
