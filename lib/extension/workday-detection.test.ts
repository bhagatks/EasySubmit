import { describe, expect, it } from "vitest";
import {
  detectWorkdayConfidence,
  parseWorkdayTitleFromUrl,
  resolveWorkdayApplyUrl,
  scrapeWorkdayTitle,
  workdayApplyStepNeedsDescription,
} from "@/src/shared/extension/workday-helpers";

const WALMART_JOB_URL =
  "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager--Program-Management_R-2522742?q=manager";

describe("parseWorkdayTitleFromUrl", () => {
  it("decodes Walmart Workday posting slugs", () => {
    expect(parseWorkdayTitleFromUrl(WALMART_JOB_URL)).toBe(
      "Senior Manager, Program Management",
    );
  });

  it("decodes Walmart Workday /details/ posting slugs", () => {
    expect(
      parseWorkdayTitleFromUrl(
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1?q=manager",
      ),
    ).toContain("Senior Manager");
  });
});

describe("scrapeWorkdayTitle", () => {
  it("falls back to URL slug when the SPA has not hydrated", () => {
    const emptyDoc = {
      querySelector: () => null,
      defaultView: { location: { href: WALMART_JOB_URL } },
    } as unknown as Document;

    expect(scrapeWorkdayTitle(emptyDoc, WALMART_JOB_URL)).toBe(
      "Senior Manager, Program Management",
    );
  });
});

describe("detectWorkdayConfidence", () => {
  it("scores Walmart Workday URLs high enough before DOM hydration", () => {
    const emptyDoc = {
      body: { innerText: "" },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    expect(detectWorkdayConfidence(emptyDoc, WALMART_JOB_URL)).toBeGreaterThanOrEqual(78);
  });

  it("scores Workday /details/ URLs high enough before DOM hydration", () => {
    const emptyDoc = {
      body: { innerText: "" },
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    expect(
      detectWorkdayConfidence(
        emptyDoc,
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1",
      ),
    ).toBeGreaterThanOrEqual(78);
  });
});

describe("resolveWorkdayApplyUrl", () => {
  it("appends /apply before query string on posting URLs", () => {
    expect(resolveWorkdayApplyUrl(WALMART_JOB_URL)).toBe(
      "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager--Program-Management_R-2522742/apply?q=manager",
    );
  });
});

describe("workdayApplyStepNeedsDescription", () => {
  it("flags apply-step pages with short descriptions", () => {
    const applyUrl =
      "https://cvshealth.wd1.myworkdayjobs.com/CVS_Health_Careers/job/TX/Lead-Director_R0942300/apply";
    expect(workdayApplyStepNeedsDescription(applyUrl, "short")).toBe(true);
    expect(workdayApplyStepNeedsDescription(applyUrl, "x".repeat(200))).toBe(false);
  });
});
