export type {
  JDSeniority,
  JDScope,
  JDDomain,
  JDImpactDimension,
  JDSegments,
  JSONLDJobFields,
  JDIntelligence,
  ResumeEnhanceDirective,
} from "@/lib/job-tracker/jd/jd-intelligence";
export { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
export { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";
export { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";
export {
  extractJDIntelligenceSync,
  detectSeniority,
  detectScope,
  detectDomain,
  extractYearsExp,
  extractTieredKeywords,
} from "@/lib/job-tracker/jd/jd-extractor";
export { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
export type { JDAnalysisInput, JDAnalysisResult } from "@/lib/job-tracker/jd/jd-brain";
export {
  analyzeJobDescription,
  analyzeJobDescriptionSync,
  hashJobDescription,
} from "@/lib/job-tracker/jd/jd-brain";
