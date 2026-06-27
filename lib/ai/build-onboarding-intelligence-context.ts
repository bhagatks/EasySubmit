import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { fetchRoleVocabulary } from "@/lib/job-tracker/ats/onet-service";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

export type OnboardingIntelligenceContext = {
  intelligence: JobIntelligence;
  directive: ResumeEnhanceDirective;
};

/**
 * Lite intelligence context for onboarding enhance — no JD, no AI.
 * Runs only O*NET vocabulary fetch + bullet quality analysis.
 * Everything JD-dependent (keyword gap, ATS parse, JD brain) is skipped.
 */
export async function buildOnboardingIntelligenceContext(
  form: HubRefineryForm,
  targetRole: string,
  traceId = "no-trace",
  userId = "unknown",
): Promise<OnboardingIntelligenceContext> {
  logEnhance("server", "pre.onboarding.start", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.PRE_ONBOARDING_START,
    targetRole,
  });

  const primeData = refineryFormToPrimeResume(form);

  const hasMinimumContent =
    (form.experience?.filter((e) => !e.hidden && e.title?.trim()).length ?? 0) >= 1;

  const [vocab, quality] = await Promise.all([
    fetchRoleVocabulary(targetRole),
    Promise.resolve(analyzeBulletQuality(primeData)),
  ]);

  logEnhance("server", "pre.onet.done", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.PRE_ONET_FETCH,
    matchedTitle: vocab.matchedTitle,
    skillsCount: vocab.skills.length,
    toolsCount: vocab.tools.length,
  });

  const resumeSkillsLower = new Set(
    (primeData.skills ?? []).map((s) => s.toLowerCase().trim()),
  );

  const onetTerms = [
    ...vocab.skills.map((s) => s.toLowerCase()),
    ...vocab.tools.map((t) => t.toLowerCase()),
  ];

  const implicitSkillsToAdd = onetTerms
    .filter((s) => !resumeSkillsLower.has(s))
    .slice(0, 8);

  const weakBullets = quality.entries.flatMap((entry, ei) =>
    entry.bullets
      .map((bullet, bi) => ({ bullet, bi }))
      .filter(({ bullet }) => bullet.issues.length > 0)
      .map(({ bullet, bi }) => ({
        experienceIndex: ei,
        bulletIndex: bi,
        bulletText: bullet.text,
        issues: bullet.issues.map((i) => i.type) as Array<"weak-verb" | "weak-phrase" | "no-metric">,
      })),
  );

  logEnhance("server", "pre.bullet_quality.done", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.PRE_BULLET_QUALITY,
    weakBulletsCount: weakBullets.length,
    hasMinimumContent,
  });

  const intelligence: JobIntelligence = {
    missingKeywords: [],
    skillsToAdd: [],
    keywordsForContent: [],
    implicitSkillsToAdd,
    weakBullets,
    structuralWarnings: [],
    coveragePercent: 0,
    hasMinimumContent,
    onetMatchedTitle: vocab.matchedTitle !== targetRole ? vocab.matchedTitle : undefined,
  };

  const directive: ResumeEnhanceDirective = {
    mustAddSkills: implicitSkillsToAdd,
    mustRemoveSkills: [],
    mustWeaveKeywords: [],
    effectiveTargetRole: null,
    roleLevel: "mid",
    scope: "ic",
    targetVerbs: [],
    impactDimensions: [],
    quantHints: [],
    summaryTheme: "",
    emphasisAreas: [],
    deprioritize: [],
    cultureSignals: { velocity: null, ownership: null, industry: [] },
  };

  logEnhance("server", "pre.context.ready", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.PRE_CONTEXT_READY,
    implicitSkillsToAdd,
    implicitSkillsCount: implicitSkillsToAdd.length,
    weakBulletsCount: weakBullets.length,
  });

  return { intelligence, directive };
}
