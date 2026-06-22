import type { ExtensionPlatform, SiteAdapter } from "./types";
import {
  hasApplyAction,
  hasJobSectionKeywords,
  scrapeCompany,
  scrapeDescription,
  scrapeLocation,
  scrapeSalary,
  scrapeTitle,
} from "./scrape-helpers";
import {
  hasStrongJobUrlSignal,
  parseCompanyFromJobHost,
  parseJobTitleFromUrl,
  parseLocationFromJobUrl,
} from "./job-url-parse";
import {
  parseLinkedInCompanyFromDoc,
  parseLinkedInLocationFromDoc,
} from "./linkedin-helpers";
import {
  detectWorkdayConfidence,
  scrapeWorkdayCompany,
  scrapeWorkdayLocations,
  scrapeWorkdaySalary,
  scrapeWorkdayTitle,
} from "./workday-helpers";

function baseAdapter(
  platform: ExtensionPlatform,
  urlPatterns: RegExp[],
  mountSelectors: string[],
  companySelectors: string[],
  locationSelectors: string[],
  titleFallbacks: string[],
  salarySelectors: string[] = [],
): SiteAdapter {
  return {
    platform,
    urlPatterns,
    mountSelectors,
    detectConfidence: (doc, url) => {
      const urlMatch = urlPatterns.some((p) => p.test(url));
      let score = urlMatch ? 40 : 0;
      if (urlMatch && hasStrongJobUrlSignal(url)) score = Math.max(score, 72);
      if (scrapeDescription(doc).length >= 80) score += 35;
      if (hasApplyAction(doc)) score += 15;
      if (hasJobSectionKeywords(doc)) score += 10;
      return Math.min(100, score);
    },
    scrape: (doc) => {
      const url = doc.defaultView?.location?.href ?? "";
      const title = scrapeTitle(doc, titleFallbacks) || parseJobTitleFromUrl(url) || "";
      if (!title) return null;
      return {
        title,
        company: scrapeCompany(doc, companySelectors) ?? parseCompanyFromJobHost(url),
        location: scrapeLocation(doc, locationSelectors) ?? parseLocationFromJobUrl(url),
        salaryText: scrapeSalary(doc, salarySelectors),
        description: scrapeDescription(doc) || null,
        platform,
        confidence: 0,
      };
    },
  };
}

export const linkedinAdapter: SiteAdapter = {
  ...baseAdapter(
    "linkedin",
    [/linkedin\.com\/jobs\/(view|collections)/i, /linkedin\.com\/jobs\//i],
    [".jobs-search__job-details", ".job-view-layout", "main"],
    [
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__primary-description-container a",
    ],
    [
      ".job-details-jobs-unified-top-card__bullet",
      ".jobs-unified-top-card__bullet",
      ".job-details-jobs-unified-top-card__primary-description-container",
    ],
    [
      ".job-details-jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title h1",
      "[data-test-id='job-details-job-title']",
      "h1",
    ],
  ),
  scrape(doc) {
    const url = doc.defaultView?.location?.href ?? "";
    const title =
      scrapeTitle(doc, [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title h1",
        "[data-test-id='job-details-job-title']",
        "h1",
      ]) ||
      parseJobTitleFromUrl(url) ||
      "";
    if (!title) return null;
    return {
      title,
      company:
        scrapeCompany(doc, [
          ".job-details-jobs-unified-top-card__company-name",
          ".jobs-unified-top-card__company-name",
          ".job-details-jobs-unified-top-card__primary-description-container a",
        ]) ?? parseLinkedInCompanyFromDoc(doc),
      location:
        scrapeLocation(doc, [
          ".job-details-jobs-unified-top-card__bullet",
          ".jobs-unified-top-card__bullet",
          ".job-details-jobs-unified-top-card__primary-description-container",
        ]) ?? parseLinkedInLocationFromDoc(doc),
      salaryText: scrapeSalary(doc, []),
      description: scrapeDescription(doc) || null,
      platform: "linkedin",
      confidence: 0,
    };
  },
};

export const indeedAdapter = baseAdapter(
  "indeed",
  [/indeed\.com\/(viewjob|rc\/clk|jobs)/i],
  ["#jobsearch-ViewjobPaneWrapper", ".jobsearch-ViewJobLayout--embedded"],
  ["[data-company-name]", ".jobsearch-InlineCompanyRating"],
  [".jobsearch-JobInfoHeader-subtitle div", "[data-testid='inlineHeader-companyLocation']"],
  ["h1.jobsearch-JobInfoHeader-title", "h1"],
  [".jobsearch-JobMetadataHeader-item", "#salaryInfoAndJobType"],
);

export const greenhouseAdapter = baseAdapter(
  "greenhouse",
  [/boards\.greenhouse\.io\/.*\/jobs\//i],
  ["#content", ".content", "main"],
  [".company-name", ".logo-container a"],
  [".location"],
  ["h1.app-title", "h1"],
);

export const workdayAdapter: SiteAdapter = {
  platform: "workday",
  urlPatterns: [/myworkdayjobs\.com\/(?:[^/]+\/)+(?:job|details)\//i],
  mountSelectors: ["[data-automation-id='jobPostingPage']", "main", "body"],
  detectConfidence: detectWorkdayConfidence,
  scrape: (doc) => {
    const url = doc.defaultView?.location?.href ?? "";
    const title = scrapeWorkdayTitle(doc, url);
    if (!title) return null;
    const description = scrapeDescription(doc) || null;
    return {
      title,
      company: scrapeWorkdayCompany(doc, url),
      location: scrapeWorkdayLocations(doc, description),
      salaryText: scrapeWorkdaySalary(doc, description),
      description,
      platform: "workday",
      confidence: 0,
    };
  },
};

export const genericAdapter = baseAdapter(
  "generic",
  [
    /\/(jobs?|careers?|postings?|openings?)\//i,
    /\/jobdetail\b/i,
    /\/careersmarketplace\//i,
    /[?&](job|jobid|posting)=/i,
  ],
  ["main", "article", "[role='main']", "body"],
  [
    "[data-ph-at-id='job-company-name']",
    "[data-company]",
    ".company",
    ".iCIMS_CompanyName",
  ],
  [
    "[data-ph-at-id='job-location']",
    "[class*='location']",
    "[data-location]",
    ".location",
    ".iCIMS_JobHeaderTag",
  ],
  [
    "[data-ph-at-id='job-title']",
    "h1",
    "[class*='job-title']",
    "[class*='posting-title']",
    ".iCIMS_JobHeaderHeading",
  ],
);

export const ALL_ADAPTERS = [
  linkedinAdapter,
  indeedAdapter,
  greenhouseAdapter,
  workdayAdapter,
  genericAdapter,
];
