import { describe, expect, it } from "vitest";
import {
  hasStrongJobUrlSignal,
  parseCompanyFromJobHost,
  parseJobTitleFromUrl,
  parseLocationFromJobUrl,
} from "@/src/shared/extension/job-url-parse";

const FIXTURE_URLS = {
  slalom:
    "https://jobs.slalom.com/en_US/careersmarketplace/JobDetail?jobId=1959?source=LinkedIn&src=LinkedIn",
  linkedin:
    "https://www.linkedin.com/jobs/view/4409341964/?alternateChannel=search&refId=abc",
  optimum:
    "https://www.optimumcareers.com/job/Plano-Manager-Software-Engineering-TX-75024/1322795100/?feedId=414300",
  walmartDetails:
    "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1?q=manager",
  cvs: "https://jobs.cvshealth.com/us/en/job/R0942300/Lead-Director-Software-Development-Engineering",
} as const;

describe("job-url-parse", () => {
  it("parses Workday /details/ posting slugs", () => {
    expect(parseJobTitleFromUrl(FIXTURE_URLS.walmartDetails)).toContain("Senior Manager");
  });

  it("parses Phenom-style CVS job slug", () => {
    expect(parseJobTitleFromUrl(FIXTURE_URLS.cvs)).toBe(
      "Lead Director Software Development Engineering",
    );
  });

  it("parses iCIMS-style Optimum job slug", () => {
    expect(parseJobTitleFromUrl(FIXTURE_URLS.optimum)).toContain("Manager Software Engineering");
    expect(parseLocationFromJobUrl(FIXTURE_URLS.optimum)).toBe("Plano, TX 75024");
  });

  it("detects strong URL signals for reported careers sites", () => {
    expect(hasStrongJobUrlSignal(FIXTURE_URLS.linkedin)).toBe(true);
    expect(hasStrongJobUrlSignal(FIXTURE_URLS.walmartDetails)).toBe(true);
    expect(hasStrongJobUrlSignal(FIXTURE_URLS.cvs)).toBe(true);
    expect(hasStrongJobUrlSignal(FIXTURE_URLS.optimum)).toBe(true);
    expect(hasStrongJobUrlSignal(FIXTURE_URLS.slalom)).toBe(true);
  });

  it("resolves company labels from careers hosts", () => {
    expect(parseCompanyFromJobHost(FIXTURE_URLS.slalom)).toBe("Slalom");
    expect(parseCompanyFromJobHost(FIXTURE_URLS.cvs)).toBe("CVS Health");
    expect(parseCompanyFromJobHost(FIXTURE_URLS.optimum)).toBe("Optimum");
  });
});
