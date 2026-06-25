import type { ExtensionPlatform, SiteAdapter } from "./types";
import {
  hasApplyAction,
  hasJobSectionKeywords,
  parseJsonLdJobFields,
  scrapeCompany,
  scrapeDescription,
  scrapeLocation,
  scrapeSalary,
  scrapeTitle,
} from "./scrape-helpers";
import { pierceTextContent } from "./shadow-dom";
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
      const jsonLdFields = parseJsonLdJobFields(doc);
      return {
        title,
        company: scrapeCompany(doc, companySelectors) ?? parseCompanyFromJobHost(url),
        location: scrapeLocation(doc, locationSelectors) ?? parseLocationFromJobUrl(url),
        salaryText: scrapeSalary(doc, salarySelectors),
        description: scrapeDescription(doc) || null,
        platform,
        confidence: 0,
        ...(jsonLdFields ? { jsonLdFields } : {}),
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
    const jsonLdFields = parseJsonLdJobFields(doc);
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
      ...(jsonLdFields ? { jsonLdFields } : {}),
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
  [/(?:boards|job-boards)\.greenhouse\.io\/.*\/jobs\//i, /[?&]gh_jid=\d+/i],
  ["#content", ".content", "main", "#grnhse_app", "[id*='grnhse']"],
  [".company-name", ".logo-container a"],
  [".location"],
  ["h1.app-title", "h1", "[class*='job-title']"],
);

export const workdayAdapter: SiteAdapter = {
  platform: "workday",
  urlPatterns: [/myworkdayjobs\.com\/(?:[^/]+\/)+(?:job|details)\//i],
  mountSelectors: ["[data-automation-id='jobPostingPage']", "main", "body"],
  detectConfidence: detectWorkdayConfidence,
  scrape: (doc) => {
    const url = doc.defaultView?.location?.href ?? "";
    // Try shadow DOM first (Workday Web Components pierce), fall back to standard scrape
    const shadowTitle =
      pierceTextContent(doc, "[data-automation-id='jobPostingHeader']") ||
      pierceTextContent(doc, "[data-automation-id='job-posting-header-jobPostingTitle']");
    const title = shadowTitle || scrapeWorkdayTitle(doc, url);
    if (!title) return null;
    const description = scrapeDescription(doc) || null;
    const jsonLdFields = parseJsonLdJobFields(doc);
    return {
      title,
      company: scrapeWorkdayCompany(doc, url),
      location: scrapeWorkdayLocations(doc, description),
      salaryText: scrapeWorkdaySalary(doc, description),
      description,
      platform: "workday",
      confidence: 0,
      ...(jsonLdFields ? { jsonLdFields } : {}),
    };
  },
};

export const genericAdapter = baseAdapter(
  "generic",
  [
    /\/(jobs?|careers?|postings?|openings?)\//i,
    /\/jobdetail\b/i,
    /\/careersmarketplace\//i,
    /[?&](job|jobid|posting|gh_jid)=/i,
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

export const leverAdapter = baseAdapter(
  "lever",
  [/jobs\.lever\.co\/[^/]+\/[a-f0-9-]{36}/i, /jobs\.lever\.co\/[^/]+\/[^/?#]+/i],
  ["main", ".posting", ".content", "body"],
  [".posting-headline .company", ".main-header-logo img[alt]", ".logo"],
  [".posting-categories .location", ".sort-by-time .location"],
  ["h2.posting-title", "h1", ".posting-headline h2"],
);

export const ashbyAdapter = baseAdapter(
  "ashby",
  [/jobs\.ashbyhq\.com\/[^/]+\/[a-f0-9-]{36}/i, /jobs\.ashbyhq\.com\/[^/]+\/[^/?#]+/i],
  ["main", "[class*='JobPosting']", "body"],
  ["[class*='CompanyName']", "[data-testid='company-name']"],
  ["[class*='Location']", "[data-testid='location']"],
  ["h1", "[class*='JobTitle']", "[data-testid='job-title']"],
);

export const icimsAdapter = baseAdapter(
  "icims",
  [/icims\.com/i, /\/job\/[^/]+\/\d+\/?/i],
  [".iCIMS_JobContent", "main", "body"],
  [".iCIMS_CompanyName", "[data-company]"],
  [".iCIMS_JobHeaderTag", "[class*='location']"],
  [".iCIMS_JobHeaderHeading", "h1", "[class*='job-title']"],
);

export const smartrecruitersAdapter = baseAdapter(
  "smartrecruiters",
  [/smartrecruiters\.com\/[^/]+\/[^/]+/i, /jobs\.smartrecruiters\.com/i],
  ["main", "[class*='job-ad']", "body"],
  [".company-name", "[data-test='company-name']"],
  [".job-location", "[data-test='job-location']"],
  ["h1", "[data-test='job-title']", ".job-title"],
);

export const taleoAdapter = baseAdapter(
  "taleo",
  [/taleo\.net/i, /oracle\.com\/taleo/i, /\/jobdetail\.ftl/i],
  ["main", "#requisitionDescriptionInterface", "body"],
  [".company", "[id*='company']"],
  [".location", "[id*='location']"],
  ["h1", ".jobTitle", "[class*='title']"],
);

export const jobviteAdapter = baseAdapter(
  "jobvite",
  [/jobvite\.com/i, /jobs\.jobvite\.com/i],
  ["main", ".jv-page", "body"],
  [".jv-company-name", ".company"],
  [".jv-job-detail-meta", ".location"],
  ["h1", ".jv-job-title", "[class*='job-title']"],
);

// ── Phase 2 Adapters ────────────────────────────────────────────────────────
// JSON-LD is the primary signal for all Phase 2 platforms; DOM selectors are
// secondary fallback. These are less-common ATSes where full adapter work is
// deferred — genericAdapter serves as final fallback.

export const successfactorsAdapter = baseAdapter(
  "successfactors",
  [/successfactors\.com\/career\?/i, /\.successfactors\.eu\//i, /\.sapsf\.com\//i],
  ["#career-job-req", ".jobDetails", "main", "body"],
  [".companyLogo img[alt]", "[id*='company']"],
  [".jobReq-detail li", "[class*='location']"],
  ["h2.jobTitle", "h1", "[class*='job-title']"],
);

export const workableAdapter = baseAdapter(
  "workable",
  [/apply\.workable\.com\//i, /jobs\.workable\.com\//i],
  ["[class*='job-description']", "main", "body"],
  ["[class*='company-name']", "[data-ui='company-name']"],
  ["[class*='location']", "[data-ui='location']"],
  ["h1", "[class*='job-title']", "[data-ui='job-title']"],
);

export const bamboohrAdapter = baseAdapter(
  "bamboohr",
  [/bamboohr\.com\/careers\//i, /bamboohr\.com\/jobs\//i],
  ["#BambooHR-ATS", ".BambooHR-ATS", "main", "body"],
  [".BambooHR-ATS-companyName", "[class*='company']"],
  [".BambooHR-ATS-Location", "[class*='location']"],
  ["h2.BambooHR-ATS-jobTitle", "h1", "[class*='job-title']"],
);

export const adpAdapter = baseAdapter(
  "adp",
  [/adp\.com\/.*\/jobs\//i, /workforcenow\.adp\.com\//i, /\.adp\.com\/candidate\//i],
  ["[class*='job-detail']", "main", "body"],
  ["[class*='company']", "[id*='company']"],
  ["[class*='location']", "[id*='location']"],
  ["h1", "[class*='jobTitle']", "[class*='job-title']"],
);

export const ripplingAdapter = baseAdapter(
  "rippling",
  [/app\.rippling\.com\/ats\//i, /jobs\.rippling\.com\//i],
  ["[class*='JobPosting']", "main", "body"],
  ["[class*='CompanyName']", "[class*='company-name']"],
  ["[class*='Location']", "[class*='location']"],
  ["h1", "[class*='JobTitle']", "[class*='job-title']"],
);

export const jazzhrAdapter = baseAdapter(
  "jazzhr",
  [/applytojob\.com\//i, /\.resumatorapi\.com\//i],
  ["#app-page", ".jobs-content", "main", "body"],
  [".company-name", "[class*='company']"],
  [".job-info-item", "[class*='location']"],
  ["h1", ".job-title", "[class*='job-title']"],
);

export const paylocityAdapter = baseAdapter(
  "paylocity",
  [/recruiting\.paylocity\.com\//i],
  ["[class*='JobDetail']", "main", "body"],
  ["[class*='CompanyName']", "[class*='company']"],
  ["[class*='Location']", "[class*='location']"],
  ["h1", "[class*='JobTitle']", "[class*='job-title']"],
);

export const paycomAdapter = baseAdapter(
  "paycom",
  [/careers\.paycom\.com\//i, /\.paycom\.com\/applicant-tracking\//i],
  ["[class*='job-detail']", "main", "body"],
  ["[class*='company']", "[id*='company']"],
  ["[class*='location']", "[id*='location']"],
  ["h1", "[class*='job-title']"],
);

export const clearcompanyAdapter = baseAdapter(
  "clearcompany",
  [/app\.clearcompany\.com\/careers\//i],
  ["[class*='job-post']", "main", "body"],
  ["[class*='company']", "[class*='employer']"],
  ["[class*='location']"],
  ["h1", "[class*='title']"],
);

export const teamtailorAdapter = baseAdapter(
  "teamtailor",
  [/teamtailor\.com\//i, /\.teamtailor\.com\//i],
  ["[class*='job-post']", "[class*='JobPost']", "main", "body"],
  ["[class*='company-name']", "[class*='CompanyName']"],
  ["[class*='location']", "[class*='Location']"],
  ["h1", "[class*='job-title']", "[class*='JobTitle']"],
);

export const ALL_ADAPTERS = [
  linkedinAdapter,
  indeedAdapter,
  greenhouseAdapter,
  workdayAdapter,
  leverAdapter,
  ashbyAdapter,
  icimsAdapter,
  smartrecruitersAdapter,
  taleoAdapter,
  jobviteAdapter,
  // Phase 2
  successfactorsAdapter,
  workableAdapter,
  bamboohrAdapter,
  adpAdapter,
  ripplingAdapter,
  jazzhrAdapter,
  paylocityAdapter,
  paycomAdapter,
  clearcompanyAdapter,
  teamtailorAdapter,
  // Always last
  genericAdapter,
];
