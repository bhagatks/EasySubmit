export {
  RESUME_RULES_V2_VERSION,
  DEFAULT_RESUME_PAGE_MODE_V2,
  RESUME_PAGE_MODE_V2_OPTIONS,
  normalizeResumePageModeV2,
  isResumePageModeV2Implemented,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";

export {
  RESUME_RULES_V2_ONE_PAGE,
  RESUME_RULES_V2_TWO_PAGE,
  RESUME_RULES_V2_THREE_PAGE,
  RESUME_RULES_V2_EXTENDED,
  EXTENDED_MODE_ATS_WARNING,
  EXTENDED_MODE_ATS_WARNING_CODE,
  isUnlimitedResumeRulesProfileV2,
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";

export { validateSummaryV2, type SummaryValidationV2 } from "@/lib/resume/v2/summary-rules";

export {
  parseSkillsCategoriesV2,
  countUniqueSkillTermsV2,
  validateSkillsV2,
  type ParsedSkillCategoryV2,
  type SkillsValidationV2,
} from "@/lib/resume/v2/skills-rules";

export {
  validateExperienceBulletsV2,
  countExperienceBulletsV2,
  getExperienceRecencyTierV2,
  type BulletsValidationV2,
} from "@/lib/resume/v2/bullet-rules";

export {
  validateResumeV2,
  collectResumeValidationMessagesV2,
  type ResumeValidationResultV2,
  type ResumeValidationIssueV2,
} from "@/lib/resume/v2/validate-resume";

export {
  buildDeepSeekPromptV2,
  buildDeepSeekSystemPromptV2,
  type BuildDeepSeekPromptV2Input,
} from "@/lib/resume/v2/prompt";

export {
  computeResumeReadinessV2,
  computeResumeReadinessV2FromForm,
  countSkillTermsFromTextV2,
  getReadinessRecencyTierV2,
  isV1BulletCapParseWarning,
  type ComputeResumeReadinessV2Options,
  type ResumeReadinessResultV2,
} from "@/lib/resume/v2/resume-readiness-score";

export {
  buildExperienceBlobFromPrime,
  deriveJDIntelligenceForReadinessV2,
  filterKeywordGapForReadinessV2,
  resolveKeywordGapForReadinessV2,
  type ResolveKeywordGapForReadinessV2Options,
} from "@/lib/resume/v2/keyword-scoring";

export { isResumeRulesV2Enabled } from "@/lib/resume/v2/runtime";

export {
  repairResumeFormV2,
  countBulletQuantRateFromForm,
  type RepairResumeFormV2Input,
  type RepairResumeFormV2Result,
} from "@/lib/resume/v2/readiness-repair";
