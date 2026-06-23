/** URLs that must never show the job card or save as a job. */
export const NEGATIVE_DETECTION_URLS = {
  cvsCareerAreas: "https://jobs.cvshealth.com/us/en/careerareas",
  cvsJobSearch: "https://jobs.cvshealth.com/us/en/job-search",
  linkedinSearch: "https://www.linkedin.com/jobs/search/?keywords=engineer",
  indeedSearch: "https://www.indeed.com/jobs?q=engineer",
  greenhouseBoard: "https://boards.greenhouse.io/example",
} as const;

/** Real posting URLs — must detect (may use URL-only pre-hydration). */
export const POSITIVE_DETECTION_URLS = {
  cvsJob: "https://jobs.cvshealth.com/us/en/job/R0942300/Lead-Director-Software-Development-Engineering",
  lever: "https://jobs.lever.co/example/abc12345-6789-4abc-8abc-123456789abc",
  ashby: "https://jobs.ashbyhq.com/example/abc12345-6789-4abc-8abc-123456789abc",
} as const;
