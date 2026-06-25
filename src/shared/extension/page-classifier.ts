import { parseJobDescriptionFromJsonLd } from "./scrape-helpers";
import { hasStrongJobUrlSignal, parseJobTitleFromUrl } from "./job-url-parse";
import { isWorkdayApplyStepUrl, isWorkdayJobUrl } from "./workday-helpers";
import { isGreenhouseEmbeddedJobUrl } from "./greenhouse-helpers";

/** What kind of careers page this URL/DOM represents. */
export type PageKind =
  | "job_posting"
  | "apply_form"
  | "careers_hub"
  | "search_results"
  | "unknown";

export type PageClassification = {
  kind: PageKind;
  /** Stable reason codes for logs, tests, and capture diagnostics. */
  reasons: string[];
};

const HUB_PATH_PATTERNS: RegExp[] = [
  /\/careerareas?\/?$/i,
  /\/job-search\/?$/i,
  /\/(?:jobs?\/)?(?:search|browse)\/?$/i,
  /\/careers?\/?$/i,
  /\/talentcommunity\/?$/i,
  /\/life-at-/i,
  /\/who-we-are\/?$/i,
];

const SEARCH_PATH_PATTERNS: RegExp[] = [
  /\/jobs\/search/i,
  /\/jobsearch/i,
  /[?&]keywords=/i,
  /linkedin\.com\/jobs\/search/i,
  /indeed\.com\/jobs\?/i,
];

function pushReason(reasons: string[], code: string): void {
  if (!reasons.includes(code)) reasons.push(code);
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const PHENOM_CAREER_HOSTS = new Set([
  "jobs.cvshealth.com",
]);

/** Phenom Talent Community hosts — do not treat all `jobs.*` subdomains as Phenom (e.g. Slalom iCIMS). */
export function isPhenomCareersHost(hostname: string): boolean {
  return PHENOM_CAREER_HOSTS.has(hostname) || hostname.endsWith(".phenom.com");
}

export function isPhenomJobPostingPath(pathname: string): boolean {
  return /\/job\/[^/]+\/[^/]+/i.test(pathname);
}

function hasJsonLdJobPosting(doc: Document | null | undefined): boolean {
  if (!doc) return false;
  return parseJobDescriptionFromJsonLd(doc, 40).length >= 40;
}

/**
 * URL-first page taxonomy — reject hubs before DOM heuristics can false-positive.
 * Used by `isJobPage`, `detectJobPage`, and the detect-eval CLI.
 */
export function classifyJobPage(url: string, doc?: Document | null): PageClassification {
  const reasons: string[] = [];
  const pathname = pathnameOf(url);
  const hostname = hostnameOf(url);
  const lower = url.toLowerCase();

  if (isWorkdayApplyStepUrl(url)) {
    pushReason(reasons, "workday:apply_step");
    return { kind: "apply_form", reasons };
  }

  if (isGreenhouseEmbeddedJobUrl(url)) {
    pushReason(reasons, "greenhouse:gh_jid");
    return { kind: "job_posting", reasons };
  }

  if (SEARCH_PATH_PATTERNS.some((pattern) => pattern.test(lower))) {
    pushReason(reasons, "path:search_results");
    return { kind: "search_results", reasons };
  }

  if (HUB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    pushReason(reasons, "path:careers_hub");
    return { kind: "careers_hub", reasons };
  }

  // Phenom-powered tenant sites (CVS and explicit allowlist)
  if (isPhenomCareersHost(hostname)) {
    if (!isPhenomJobPostingPath(pathname)) {
      if (hasJsonLdJobPosting(doc)) {
        pushReason(reasons, "phenom:jsonld_job_posting");
        return { kind: "job_posting", reasons };
      }
      pushReason(reasons, "phenom:missing_job_path");
      return { kind: "careers_hub", reasons };
    }
    pushReason(reasons, "phenom:job_path");
    return { kind: "job_posting", reasons };
  }

  if (isWorkdayJobUrl(url) && (parseJobTitleFromUrl(url) || hasStrongJobUrlSignal(url))) {
    pushReason(reasons, "workday:job_url");
    return { kind: "job_posting", reasons };
  }

  if (hasStrongJobUrlSignal(url)) {
    pushReason(reasons, "url:strong_job_signal");
    return { kind: "job_posting", reasons };
  }

  if (/\/(jobs?|careers?|postings?|openings?|vacancy|position)\//i.test(pathname)) {
    pushReason(reasons, "path:job_like");
    return { kind: "unknown", reasons };
  }

  pushReason(reasons, "url:no_posting_signal");
  return { kind: "unknown", reasons };
}

/** @deprecated Prefer `classifyJobPage` — kept for callers that only need hub rejection. */
export function isCareersListingOrHubUrl(url: string): boolean {
  const { kind } = classifyJobPage(url);
  return kind === "careers_hub" || kind === "search_results";
}

export function isJobPostingPage(url: string, doc?: Document | null): boolean {
  const { kind } = classifyJobPage(url, doc);
  return kind === "job_posting" || kind === "apply_form";
}
