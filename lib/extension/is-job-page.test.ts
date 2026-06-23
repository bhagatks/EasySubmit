import { describe, expect, it } from "vitest";
import { isJobPage } from "@/src/shared/extension/is-job-page";

const emptyDoc = {
  body: { innerText: "" },
  querySelector: () => null,
  querySelectorAll: () => [],
} as unknown as Document;

const FIXTURE_URLS = {
  slalom:
    "https://jobs.slalom.com/en_US/careersmarketplace/JobDetail?jobId=1959?source=LinkedIn&src=LinkedIn",
  linkedin: "https://www.linkedin.com/jobs/view/4409341964/",
  optimum:
    "https://www.optimumcareers.com/job/Plano-Manager-Software-Engineering-TX-75024/1322795100/",
  walmartDetails:
    "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1",
  cvs: "https://jobs.cvshealth.com/us/en/job/R0942300/Lead-Director-Software-Development-Engineering",
} as const;

describe("isJobPage", () => {
  it("detects Workday postings from URL before SPA hydration", () => {
    expect(
      isJobPage(
        emptyDoc,
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager--Program-Management_R-2522742",
      ),
    ).toBe(true);
  });

  it("detects Workday /details/ URLs before hydration", () => {
    expect(isJobPage(emptyDoc, FIXTURE_URLS.walmartDetails)).toBe(true);
  });

  it("detects LinkedIn job view URLs", () => {
    expect(isJobPage(emptyDoc, FIXTURE_URLS.linkedin)).toBe(true);
  });

  it("detects CVS Phenom careers URLs", () => {
    expect(isJobPage(emptyDoc, FIXTURE_URLS.cvs)).toBe(true);
  });

  it("detects Optimum iCIMS careers URLs", () => {
    expect(isJobPage(emptyDoc, FIXTURE_URLS.optimum)).toBe(true);
  });

  it("detects Slalom JobDetail URLs", () => {
    expect(isJobPage(emptyDoc, FIXTURE_URLS.slalom)).toBe(true);
  });

  it("detects Workday apply-step URLs", () => {
    expect(
      isJobPage(
        emptyDoc,
        "https://cvshealth.wd1.myworkdayjobs.com/CVS_Health_Careers/job/TX---Richardson/Lead-Director_R0942300/apply",
      ),
    ).toBe(true);
  });

  it("rejects CVS career area hub pages (not a single posting)", () => {
    expect(isJobPage(emptyDoc, "https://jobs.cvshealth.com/us/en/careerareas")).toBe(false);
  });
});
