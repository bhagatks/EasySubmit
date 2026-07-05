/**
 * Resume Readiness Score V2 — same four pillars as v1, scored with RULES v2 profiles.
 *
 * Uses validateSummaryV2 / validateSkillsV2 / validateExperienceBulletsV2 instead of
 * v1 comma-skills and hard six-bullet export caps. Parse warnings from the ATS simulator
 * still apply, but v1 §8 bullet-cap messages are filtered out.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { simulateAtsParse, simulateAtsParsePlatform } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { computeSemanticSimilarity } from "@/lib/job-tracker/ats/semantic-similarity";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { AtsPlatform } from "@/lib/job-tracker/ats/platform-rules";
import type {
  ActionSeverity,
  PrioritizedAction,
  ReadinessPillar,
  ResumeReadinessResult,
} from "@/lib/job-tracker/ats/resume-readiness-score";
import { findBannedSkills } from "@/lib/resume/skills-rules";
import {
  DEFAULT_RESUME_PAGE_MODE_V2,
  normalizeResumePageModeV2,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import {
  EXTENDED_MODE_ATS_WARNING_CODE,
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import {
  countExperienceBulletsV2,
  getExperienceRecencyTierV2,
  validateExperienceBulletsV2,
} from "@/lib/resume/v2/bullet-rules";
import {
  countUniqueSkillTermsV2,
  parseSkillsCategoriesV2,
  validateSkillsV2,
} from "@/lib/resume/v2/skills-rules";
import { validateSummaryV2 } from "@/lib/resume/v2/summary-rules";
import { validateResumeV2 } from "@/lib/resume/v2/validate-resume";
import {
  buildExperienceBlobFromPrime,
  resolveKeywordGapForReadinessV2,
} from "@/lib/resume/v2/keyword-scoring";

export type ResumeReadinessResultV2 = ResumeReadinessResult & {
  version: 2;
  pageMode: ResumePageModeV2;
  profile: ResumeRulesProfileV2 | null;
  implemented: boolean;
};

export type ComputeResumeReadinessV2Options = {
  jdIntelligence?: JDIntelligence | null;
  platform?: AtsPlatform;
  pageMode?: unknown;
  /** Raw skills block (category lines). Falls back to comma-joined `data.skills`. */
  skillsText?: string;
};

const V1_BULLET_CAP_WARNING_MARKERS = [
  "RULES.md §8",
  "only the first 6",
  "above the hard max",
] as const;

function resolveSkillsText(data: PrimeResumeData, skillsText?: string): string {
  const raw = skillsText?.trim();
  if (raw) return raw;
  return (data.skills ?? []).map((skill) => skill.trim()).filter(Boolean).join(", ");
}

function experienceEntriesForV2(data: PrimeResumeData): Array<{
  title?: string;
  bullets?: string | null;
  hidden?: boolean;
}> {
  return (data.experience ?? []).map((entry) => ({
    title: entry.title,
    hidden: false,
    bullets: (entry.bullets ?? []).join("\n"),
  }));
}

function hubFormSliceForV2(
  data: PrimeResumeData,
  skillsText: string,
  pageMode: ResumePageModeV2 = DEFAULT_RESUME_PAGE_MODE_V2,
): Pick<
  HubRefineryForm,
  "professionalSummary" | "skillsText" | "experience" | "customSections" | "pageLengthPreference"
> {
  return {
    professionalSummary: data.summary ?? "",
    skillsText,
    experience: (data.experience ?? []).map((entry, index) => ({
      id: entry.id ?? `exp-${index}`,
      title: entry.title ?? "",
      company: entry.company ?? "",
      location: entry.location ?? "",
      startMonth: "",
      startYear: "",
      endMonth: "",
      endYear: "",
      bullets: (entry.bullets ?? []).join("\n"),
      hidden: false,
    })),
    customSections: (data.customSections ?? []).map((section, index) => ({
      id: `custom-${index}`,
      title: section.title,
      content: section.content,
      hidden: false,
    })),
    pageLengthPreference: pageMode,
  };
}

function primeDataForKeywords(data: PrimeResumeData, skillsText: string): PrimeResumeData {
  const categoryTerms = parseSkillsCategoriesV2(skillsText).flatMap((category) => category.terms);
  const merged = [...new Set([...(data.skills ?? []), ...categoryTerms].map((term) => term.trim()).filter(Boolean))];
  return { ...data, skills: merged };
}

function buildResumeTextV2(data: PrimeResumeData, targetTitle: string, skillsText: string): string {
  return [
    targetTitle,
    data.summary ?? "",
    skillsText,
    skillsText,
    ...(data.experience ?? []).flatMap((entry) => [
      entry.title,
      entry.company,
      ...(entry.bullets ?? []),
    ]),
    ...(data.education ?? []).flatMap((entry) => [entry.degree ?? "", entry.school]),
    ...(data.certifications ?? []),
    ...(data.projects ?? []),
    ...(data.customSections ?? []).flatMap((section) => [section.title, section.content]),
  ]
    .filter(Boolean)
    .join(" ");
}

function filterV1BulletCapWarnings(warnings: string[]): string[] {
  return warnings.filter(
    (warning) => !V1_BULLET_CAP_WARNING_MARKERS.some((marker) => warning.includes(marker)),
  );
}

function toGrade(total: number): ResumeReadinessResult["grade"] {
  if (total >= 90) return "A";
  if (total >= 75) return "B";
  if (total >= 60) return "C";
  if (total >= 45) return "D";
  return "F";
}

function deficitToSeverity(deficit: number): ActionSeverity {
  if (deficit >= 15) return "critical";
  if (deficit >= 10) return "high";
  if (deficit >= 5) return "medium";
  return "low";
}

function deriveTopActions(pillars: ResumeReadinessResult["pillars"]): PrioritizedAction[] {
  const actions: Array<{ message: string; deficit: number }> = [];

  for (const pillar of Object.values(pillars)) {
    const deficit = pillar.maxScore - pillar.score;
    if (deficit > 0) {
      for (const detail of pillar.details) {
        if (!detail.includes("✓")) {
          actions.push({ message: detail, deficit });
        }
      }
    }
  }

  return actions
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 6)
    .map((action) => ({ message: action.message, severity: deficitToSeverity(action.deficit) }));
}

function scoreCompletenessV2(
  data: PrimeResumeData,
  profile: ResumeRulesProfileV2,
  skillsText: string,
): ReadinessPillar {
  const details: string[] = [];
  let pts = 25;
  const validationOptions = {
    modeLabel: profile.modeLabel,
    unlimitedContent: profile.unlimitedContent === true,
  };

  const check = (condition: boolean, deduct: number, message: string) => {
    if (!condition) {
      pts -= deduct;
      details.push(message);
    }
  };

  check(Boolean(data.fullName?.trim()), 5, "Add your full name.");
  check(Boolean(data.email?.trim()), 4, "Add your email address.");
  check(Boolean(data.phone?.trim()), 3, "Add your phone number.");

  const summaryText = data.summary?.trim() ?? "";
  let summaryPts = 0;
  if (summaryText) {
    summaryPts = 2;
    const validation = validateSummaryV2(summaryText, profile.summary, validationOptions);
    if (validation.errors.length === 0) {
      summaryPts += 1;
    } else {
      details.push(...validation.errors);
    }
    if (
      summaryText &&
      (profile.unlimitedContent ||
        (validation.sentenceCount >= profile.summary.targetSentencesMin &&
          validation.sentenceCount <= profile.summary.targetSentencesMax &&
          validation.wordCount >= profile.summary.wordTargetMin &&
          validation.wordCount <= profile.summary.wordTargetMax))
    ) {
      summaryPts += 1;
    } else if (validation.warnings.length > 0) {
      details.push(...validation.warnings.slice(0, 2));
    }
    if (validation.bannedWords.length > 0) {
      summaryPts = Math.max(0, summaryPts - 1);
      details.push(
        `Professional Summary contains overused phrases: ${validation.bannedWords.join(", ")}.`,
      );
    }
  } else {
    details.push("Add a Professional Summary.");
  }
  pts -= 4 - summaryPts;

  const skillsValidation = validateSkillsV2(skillsText, profile.skills, validationOptions);
  const uniqueTerms = skillsValidation.uniqueTermCount;
  let skillsPts = 0;

  if (uniqueTerms === 0) {
    details.push("Add skills — the Skills section is heavily weighted.");
  } else {
    if (uniqueTerms >= 6) {
      skillsPts = 2;
    } else {
      details.push("Add at least 6 skill terms across your categories.");
    }

    if (
      uniqueTerms >= 10 &&
      (profile.unlimitedContent || uniqueTerms <= profile.skills.maxUniqueTerms)
    ) {
      skillsPts += 1;
    } else if (uniqueTerms >= 6) {
      details.push(
        profile.unlimitedContent
          ? "Aim for 10+ unique skill terms for strong ATS coverage."
          : `Aim for 10–${profile.skills.maxUniqueTerms} unique skill terms for strong ATS coverage.`,
      );
    }

    const bannedSkills = findBannedSkills(
      skillsValidation.categories.flatMap((category) => category.terms),
    );
    if (bannedSkills.length === 0) {
      skillsPts += 1;
    } else {
      details.push(
        `Skills section contains generic terms: ${bannedSkills.join(", ")}. Replace with specific tools or technologies.`,
      );
    }

    if (!profile.unlimitedContent && uniqueTerms > profile.skills.maxUniqueTerms) {
      skillsPts = Math.max(0, skillsPts - 1);
      details.push(
        `Too many unique skill terms — keep it to ${profile.skills.maxUniqueTerms} or fewer for ${profile.modeLabel} mode.`,
      );
    }

    if (skillsValidation.errors.length > 0) {
      skillsPts = Math.max(0, skillsPts - 1);
      details.push(...skillsValidation.errors);
    } else if (skillsValidation.warnings.length > 0) {
      details.push(...skillsValidation.warnings.slice(0, 2));
    }
  }
  pts -= 4 - skillsPts;

  check(
    (data.experience?.filter((entry) => entry.title?.trim() || entry.company?.trim())?.length ?? 0) >=
      1,
    5,
    "Add at least one work experience entry.",
  );

  const visibleEntries = experienceEntriesForV2(data).filter(
    (entry) => entry.title?.trim() || entry.bullets,
  );
  const recentEntry = visibleEntries[0];
  const recentCount = countExperienceBulletsV2(recentEntry?.bullets ?? "");
  const recentTier = profile.bullets.tiers.recent;
  if (!profile.unlimitedContent) {
    check(
      recentCount >= recentTier.targetMin,
      3,
      `Your most recent role needs at least ${recentTier.targetMin} bullets (target ${recentTier.targetMin}–${recentTier.targetMax} for ${profile.modeLabel} mode).`,
    );
  }

  check(
    (data.education?.filter((entry) => entry.school?.trim())?.length ?? 0) >= 1,
    2,
    "Add your education.",
  );

  return {
    label: "Completeness",
    score: Math.max(0, pts) as 25,
    maxScore: 25,
    details,
  };
}

function scoreKeywordsV2(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  skillsText: string,
  jdIntelligence?: JDIntelligence | null,
  semanticSim = 0,
): ReadinessPillar {
  if (!jobDescription.trim()) {
    return {
      label: "Keyword Match",
      score: 0 as 25,
      maxScore: 25,
      details: [
        "No job description captured — save this job from a posting page to get keyword analysis.",
      ],
    };
  }

  const keywordData = primeDataForKeywords(data, skillsText);
  const gap = resolveKeywordGapForReadinessV2(
    keywordData,
    targetTitle,
    jobDescription,
    jdIntelligence,
    { experienceBlob: buildExperienceBlobFromPrime(keywordData) },
  );
  const blendedPct = gap.coveragePercent * 0.65 + semanticSim * 0.35;
  const pts = Math.round((blendedPct / 100) * 25);
  const details: string[] = [];

  if (gap.topMissing.length > 0) {
    details.push(
      `Missing keywords from the job description: ${gap.topMissing.slice(0, 5).join(", ")}.`,
    );
  }
  if (gap.coveragePercent >= 80) {
    details.push(`Strong keyword coverage: ${gap.coveragePercent}%.`);
  } else if (gap.coveragePercent >= 50) {
    details.push(
      `Moderate keyword coverage: ${gap.coveragePercent}%. Add missing terms to Skills categories or bullets.`,
    );
  } else {
    details.push(
      `Low keyword coverage: ${gap.coveragePercent}%. Tailor your resume closely to this job description.`,
    );
  }

  return { label: "Keyword Match", score: pts as 25, maxScore: 25, details };
}

function scoreBulletQualityV2(data: PrimeResumeData, profile: ResumeRulesProfileV2): ReadinessPillar {
  const quality = analyzeBulletQuality(data);
  const details: string[] = [];

  if (quality.totalBullets === 0) {
    return {
      label: "Bullet Quality",
      score: 0 as 25,
      maxScore: 25,
      details: ["No bullet points found. Add achievement-oriented bullets to each experience."],
    };
  }

  const pts = Math.round(
    (quality.actionVerbRate / 100) * 17.5 + (quality.quantificationRate / 100) * 7.5,
  );

  if (quality.actionVerbRate < 70) {
    details.push(`${100 - quality.actionVerbRate}% of bullets don't start with an action verb.`);
  } else {
    details.push(`${quality.actionVerbRate}% of bullets use strong action verbs. ✓`);
  }

  if (quality.quantificationRate < 50) {
    details.push(
      `Only ${quality.quantificationRate}% of bullets include a measurable result — aim for 70%+.`,
    );
  } else {
    details.push(`${quality.quantificationRate}% of bullets are quantified. ✓`);
  }

  const bulletValidation = validateExperienceBulletsV2(experienceEntriesForV2(data), profile.bullets, {
    unlimitedContent: profile.unlimitedContent === true,
  });
  if (!profile.unlimitedContent) {
    const recentIssue = bulletValidation.countIssues.find((issue) => issue.tier === "recent");
    if (recentIssue && recentIssue.count > recentIssue.tierRules.warnAbove) {
      details.push(
        `"${recentIssue.roleTitle}" has ${recentIssue.count} bullets — target ${recentIssue.tierRules.targetMin}–${recentIssue.tierRules.targetMax} (warn above ${recentIssue.tierRules.warnAbove}).`,
      );
    } else {
      const recentEntry = (data.experience ?? []).find((entry) => entry.title?.trim() || entry.company?.trim());
      if (recentEntry) {
        const recentCount = countExperienceBulletsV2((recentEntry.bullets ?? []).join("\n"));
        const tierRules = profile.bullets.tiers.recent;
        if (recentCount > 0 && recentCount < tierRules.targetMin) {
          details.push(
            `Most recent role has ${recentCount} bullet(s) — aim for ${tierRules.targetMin}–${tierRules.targetMax}.`,
          );
        }
      }
    }
  }

  return { label: "Bullet Quality", score: Math.round(pts) as 25, maxScore: 25, details };
}

function scoreAtsComplianceV2(
  data: PrimeResumeData,
  targetTitle: string,
  profile: ResumeRulesProfileV2,
  skillsText: string,
  platform?: AtsPlatform,
): ReadinessPillar {
  const parsed = platform
    ? simulateAtsParsePlatform(data, targetTitle, platform)
    : simulateAtsParse(data, targetTitle);

  const parseWarnings = filterV1BulletCapWarnings(parsed.warnings);
  const validation = validateResumeV2(
    hubFormSliceForV2(data, skillsText, profile.pageMode) as HubRefineryForm,
    profile.pageMode,
  );

  const scorableWarnings = validation.warnings.filter(
    (entry) => entry.code !== EXTENDED_MODE_ATS_WARNING_CODE,
  );

  const complianceMessages = [
    ...validation.errors.map((entry) => entry.message),
    ...scorableWarnings.map((entry) => entry.message),
    ...parseWarnings,
  ];

  if (profile.unlimitedContent) {
    complianceMessages.unshift(
      validation.warnings.find((entry) => entry.code === EXTENDED_MODE_ATS_WARNING_CODE)?.message ??
        "Page mode 4+ extended — content limits are not enforced. Long resumes may parse poorly in some ATS systems.",
    );
  }

  const pts = Math.max(
    0,
    25 - validation.errors.length * 3 - scorableWarnings.length - parseWarnings.length * 3,
  );

  return {
    label: "ATS Compliance",
    score: pts as 25,
    maxScore: 25,
    details:
      complianceMessages.length === 0
        ? ["No parser warnings detected under RULES v2. ✓"]
        : complianceMessages,
  };
}

export function computeResumeReadinessV2(
  data: PrimeResumeData,
  targetTitle: string,
  jobDescription: string,
  options: ComputeResumeReadinessV2Options = {},
): ResumeReadinessResultV2 {
  const pageMode = normalizeResumePageModeV2(options.pageMode ?? DEFAULT_RESUME_PAGE_MODE_V2);
  const profile = resolveResumeRulesProfileV2(pageMode);
  const implemented = profile !== null;
  const skillsText = resolveSkillsText(data, options.skillsText);

  if (!profile) {
    const emptyPillar = (label: string, message: string): ReadinessPillar => ({
      label,
      score: 0 as 25,
      maxScore: 25,
      details: [message],
    });
    const pillars = {
      completeness: emptyPillar(
        "Completeness",
        `Resume rules v2 for page mode "${pageMode}" are not implemented yet.`,
      ),
      keywords: emptyPillar("Keyword Match", `Resume rules v2 page mode "${pageMode}" is not active.`),
      bulletQuality: emptyPillar(
        "Bullet Quality",
        `Resume rules v2 page mode "${pageMode}" is not active.`,
      ),
      atsCompliance: emptyPillar(
        "ATS Compliance",
        `Resume rules v2 page mode "${pageMode}" is not active.`,
      ),
    };
    return {
      version: 2,
      pageMode,
      profile: null,
      implemented,
      total: 0,
      grade: "F",
      pillars,
      topActions: deriveTopActions(pillars),
    };
  }

  const resumeText = buildResumeTextV2(data, targetTitle, skillsText);
  const semanticSim = jobDescription.trim()
    ? computeSemanticSimilarity(resumeText, jobDescription)
    : 0;

  const pillars = {
    completeness: scoreCompletenessV2(data, profile, skillsText),
    keywords: scoreKeywordsV2(
      data,
      targetTitle,
      jobDescription,
      skillsText,
      options.jdIntelligence,
      semanticSim,
    ),
    bulletQuality: scoreBulletQualityV2(data, profile),
    atsCompliance: scoreAtsComplianceV2(
      data,
      targetTitle,
      profile,
      skillsText,
      options.platform,
    ),
  };

  const total = Object.values(pillars).reduce((sum, pillar) => sum + pillar.score, 0);

  return {
    version: 2,
    pageMode,
    profile,
    implemented,
    total,
    grade: toGrade(total),
    pillars,
    topActions: deriveTopActions(pillars),
  };
}

export function computeResumeReadinessV2FromForm(
  form: HubRefineryForm,
  targetTitle: string,
  jobDescription: string,
  options: Omit<ComputeResumeReadinessV2Options, "skillsText" | "pageMode"> & {
    pageMode?: unknown;
  } = {},
): ResumeReadinessResultV2 {
  return computeResumeReadinessV2(
    refineryFormToPrimeResume(form, { targetRole: targetTitle }),
    targetTitle,
    jobDescription,
    {
      ...options,
      pageMode: options.pageMode ?? form.pageLengthPreference,
      skillsText: form.skillsText ?? "",
    },
  );
}

/** Useful for benchmarks: category skills text contributes to keyword coverage. */
export function countSkillTermsFromTextV2(skillsText: string): number {
  return countUniqueSkillTermsV2(parseSkillsCategoriesV2(skillsText));
}

/** Exposed for tests — v2 compliance must not penalize v1 six-bullet export warnings. */
export function isV1BulletCapParseWarning(warning: string): boolean {
  return V1_BULLET_CAP_WARNING_MARKERS.some((marker) => warning.includes(marker));
}

/** Exposed for tests — recency tier label for a visible role index. */
export function getReadinessRecencyTierV2(roleIndexAmongVisible: number) {
  return getExperienceRecencyTierV2(roleIndexAmongVisible);
}
