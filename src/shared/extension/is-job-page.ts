import {
  hasApplyAction,
  hasJobSectionKeywords,
  scrapeDescription,
} from "./scrape-helpers";
import { hasStrongJobUrlSignal } from "./job-url-parse";
import { classifyJobPage } from "./page-classifier";

/** Ported from AutoApplyAI — high-trust job posting URL shapes. */
export const HIGH_CONFIDENCE_JOB_URL_PATTERNS: RegExp[] = [
  /linkedin\.com\/jobs\/view/i,
  /linkedin\.com\/jobs\/collections/i,
  /indeed\.com\/viewjob/i,
  /indeed\.com\/rc\/clk/i,
  /(?:boards|job-boards)\.greenhouse\.io\/[^/]+\/jobs\//i,
  /[?&]gh_jid=\d+/i,
  /jobs\.lever\.co\/[^/]+/i,
  /jobs\.ashbyhq\.com\/[^/]+/i,
  /smartrecruiters\.com\/[^/]+\/[^/]+/i,
  /myworkdayjobs\.com\/(?:[^/]+\/)+(?:job|details)\//i,
  /\/jobdetail\b/i,
  /jobs\.[a-z0-9.-]+\/[a-z]{2}(?:_[a-z]{2})?\/[a-z]{2}\/job\//i,
  /\/job\/[^/]+\/\d+\/?/i,
];

const JOB_BOARD_HOST_SNIPPETS = [
  "linkedin.com/jobs",
  "indeed.com",
  "greenhouse.io",
  "lever.co",
  "workday",
  "smartrecruiters.com",
  "ashbyhq.com",
  "jobs.cvshealth.com",
  "optimumcareers.com",
  "jobs.slalom.com",
];

function hasDomJobSignals(doc: Document): boolean {
  return (
    scrapeDescription(doc).length >= 80 ||
    hasApplyAction(doc) ||
    hasJobSectionKeywords(doc)
  );
}

function hasUrlJobSignals(url: string): boolean {
  return hasStrongJobUrlSignal(url);
}

/** AutoApplyAI-style gate: URL pattern + light DOM checks (no numeric score threshold). */
export function isJobPage(doc: Document, url: string): boolean {
  const classification = classifyJobPage(url, doc);
  if (classification.kind === "careers_hub" || classification.kind === "search_results") {
    return false;
  }
  if (classification.kind === "job_posting" || classification.kind === "apply_form") {
    return true;
  }

  const lower = url.toLowerCase();

  if (HIGH_CONFIDENCE_JOB_URL_PATTERNS.some((pattern) => pattern.test(lower))) {
    return hasDomJobSignals(doc) || hasUrlJobSignals(url);
  }

  const onJobBoard = JOB_BOARD_HOST_SNIPPETS.some((host) => lower.includes(host));
  if (onJobBoard) {
    return hasDomJobSignals(doc) || hasUrlJobSignals(url);
  }

  const urlLooksLikeJob =
    /\/(job|jobs|career|careers|vacancy|posting|position|opening)s?\//i.test(url) ||
    /\/jobdetail\b/i.test(url) ||
    /[?&](job|jobid|posting|gh_jid)=/i.test(url);

  if (!urlLooksLikeJob) return false;

  let score = 0;
  if (urlLooksLikeJob) score += 2;
  if (hasApplyAction(doc)) score += 2;
  if (scrapeDescription(doc).length >= 80) score += 3;
  if (hasJobSectionKeywords(doc)) score += 2;
  if (hasUrlJobSignals(url)) score += 3;

  return score >= 5;
}
