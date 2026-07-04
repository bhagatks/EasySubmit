import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
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
 * Runs bullet quality analysis only.
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

  const quality = analyzeBulletQuality(primeData);

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
    weakBullets,
    structuralWarnings: [],
    coveragePercent: 0,
    hasMinimumContent,
  };

  const directive: ResumeEnhanceDirective = {
    mustAddSkills: [],
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
    weakBulletsCount: weakBullets.length,
  });

  return { intelligence, directive };
}
