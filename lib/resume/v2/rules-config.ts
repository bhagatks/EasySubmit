import type { ResumePageModeV2 } from "@/lib/resume/v2/page-mode";

export type SummaryRulesV2 = {
  targetSentencesMin: number;
  targetSentencesMax: number;
  warnSentencesFrom: number;
  wordTargetMin: number;
  wordTargetMax: number;
  warnWordsFrom: number;
  warnWordsTo: number;
  errorWordsFrom: number;
};

export type SkillsRulesV2 = {
  maxCategoryLines: number;
  maxUniqueTerms: number;
  softMaxTermsPerCategory: number;
  allowCategoryBlocks: boolean;
  forbidTables: boolean;
};

export type BulletTierRulesV2 = {
  targetMin: number;
  targetMax: number;
  warnAbove: number;
};

export type BulletRulesV2 = {
  hardCapPerRole: null;
  warnCharLengthAbove: number;
  targetWordsMin: number;
  targetWordsMax: number;
  tiers: {
    recent: BulletTierRulesV2;
    mid: BulletTierRulesV2;
    older: BulletTierRulesV2;
  };
};

export type ResumeRulesProfileV2 = {
  version: 2;
  pageMode: ResumePageModeV2;
  modeLabel: string;
  /** When true, content budget validators emit informational warnings only (mode 4+). */
  unlimitedContent?: boolean;
  summary: SummaryRulesV2;
  skills: SkillsRulesV2;
  bullets: BulletRulesV2;
  layout: {
    forbidTables: boolean;
    singleColumnPlainText: boolean;
  };
};

export const EXTENDED_MODE_ATS_WARNING_CODE = "extended_mode_ats_risk";

export const EXTENDED_MODE_ATS_WARNING =
  "Page mode 4+ extended — content limits are not enforced. Long resumes may parse poorly in some ATS systems.";

/** Mode 2 baseline — conservative ATS-oriented two-page budget. */
export const RESUME_RULES_V2_TWO_PAGE: ResumeRulesProfileV2 = {
  version: 2,
  pageMode: "2",
  modeLabel: "2-page",
  summary: {
    targetSentencesMin: 3,
    targetSentencesMax: 4,
    warnSentencesFrom: 5,
    wordTargetMin: 70,
    wordTargetMax: 90,
    warnWordsFrom: 91,
    warnWordsTo: 110,
    errorWordsFrom: 111,
  },
  skills: {
    maxCategoryLines: 5,
    maxUniqueTerms: 75,
    softMaxTermsPerCategory: 15,
    allowCategoryBlocks: true,
    forbidTables: true,
  },
  bullets: {
    hardCapPerRole: null,
    warnCharLengthAbove: 200,
    targetWordsMin: 15,
    targetWordsMax: 28,
    tiers: {
      recent: { targetMin: 5, targetMax: 6, warnAbove: 8 },
      mid: { targetMin: 3, targetMax: 4, warnAbove: 6 },
      older: { targetMin: 1, targetMax: 2, warnAbove: 4 },
    },
  },
  layout: {
    forbidTables: true,
    singleColumnPlainText: true,
  },
};

/** Tight one-page budget — scaled down from mode 2. */
export const RESUME_RULES_V2_ONE_PAGE: ResumeRulesProfileV2 = {
  version: 2,
  pageMode: "1",
  modeLabel: "1-page",
  summary: {
    targetSentencesMin: 2,
    targetSentencesMax: 3,
    warnSentencesFrom: 4,
    wordTargetMin: 55,
    wordTargetMax: 70,
    warnWordsFrom: 71,
    warnWordsTo: 85,
    errorWordsFrom: 86,
  },
  skills: {
    maxCategoryLines: 4,
    maxUniqueTerms: 55,
    softMaxTermsPerCategory: 12,
    allowCategoryBlocks: true,
    forbidTables: true,
  },
  bullets: {
    hardCapPerRole: null,
    warnCharLengthAbove: 180,
    targetWordsMin: 12,
    targetWordsMax: 24,
    tiers: {
      recent: { targetMin: 4, targetMax: 5, warnAbove: 7 },
      mid: { targetMin: 2, targetMax: 3, warnAbove: 5 },
      older: { targetMin: 1, targetMax: 2, warnAbove: 3 },
    },
  },
  layout: {
    forbidTables: true,
    singleColumnPlainText: true,
  },
};

/** Extended three-page narrative — scaled up from mode 2. */
export const RESUME_RULES_V2_THREE_PAGE: ResumeRulesProfileV2 = {
  version: 2,
  pageMode: "3",
  modeLabel: "3-page",
  summary: {
    targetSentencesMin: 4,
    targetSentencesMax: 5,
    warnSentencesFrom: 6,
    wordTargetMin: 95,
    wordTargetMax: 115,
    warnWordsFrom: 116,
    warnWordsTo: 135,
    errorWordsFrom: 136,
  },
  skills: {
    maxCategoryLines: 6,
    maxUniqueTerms: 90,
    softMaxTermsPerCategory: 18,
    allowCategoryBlocks: true,
    forbidTables: true,
  },
  bullets: {
    hardCapPerRole: null,
    warnCharLengthAbove: 220,
    targetWordsMin: 15,
    targetWordsMax: 30,
    tiers: {
      recent: { targetMin: 6, targetMax: 7, warnAbove: 9 },
      mid: { targetMin: 4, targetMax: 5, warnAbove: 7 },
      older: { targetMin: 2, targetMax: 3, warnAbove: 5 },
    },
  },
  layout: {
    forbidTables: true,
    singleColumnPlainText: true,
  },
};

/** Extended mode — no content limits; ATS parse risk warning only. */
export const RESUME_RULES_V2_EXTENDED: ResumeRulesProfileV2 = {
  version: 2,
  pageMode: "4+",
  modeLabel: "4+ extended",
  unlimitedContent: true,
  summary: {
    targetSentencesMin: 2,
    targetSentencesMax: 8,
    warnSentencesFrom: 9,
    wordTargetMin: 40,
    wordTargetMax: 9999,
    warnWordsFrom: 10000,
    warnWordsTo: 10000,
    errorWordsFrom: 10001,
  },
  skills: {
    maxCategoryLines: 999,
    maxUniqueTerms: 999,
    softMaxTermsPerCategory: 999,
    allowCategoryBlocks: true,
    forbidTables: true,
  },
  bullets: {
    hardCapPerRole: null,
    warnCharLengthAbove: 400,
    targetWordsMin: 10,
    targetWordsMax: 50,
    tiers: {
      recent: { targetMin: 1, targetMax: 99, warnAbove: 999 },
      mid: { targetMin: 1, targetMax: 99, warnAbove: 999 },
      older: { targetMin: 0, targetMax: 99, warnAbove: 999 },
    },
  },
  layout: {
    forbidTables: true,
    singleColumnPlainText: true,
  },
};

const PROFILE_BY_MODE: Record<ResumePageModeV2, ResumeRulesProfileV2> = {
  "1": RESUME_RULES_V2_ONE_PAGE,
  "2": RESUME_RULES_V2_TWO_PAGE,
  "3": RESUME_RULES_V2_THREE_PAGE,
  "4+": RESUME_RULES_V2_EXTENDED,
};

export function isUnlimitedResumeRulesProfileV2(profile: ResumeRulesProfileV2): boolean {
  return profile.unlimitedContent === true;
}

export function resolveResumeRulesProfileV2(
  pageMode: ResumePageModeV2,
): ResumeRulesProfileV2 | null {
  return PROFILE_BY_MODE[pageMode] ?? null;
}
