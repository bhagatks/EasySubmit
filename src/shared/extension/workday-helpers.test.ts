import { describe, expect, it } from "vitest";
import {
  humanizeWorkdaySiteName,
  isWorkdayApplyStepUrl,
  parseWorkdayCompanyFromUrl,
  parseWorkdayTitleFromUrl,
} from "./workday-helpers";

describe("workday helpers", () => {
  it("detects apply-step URLs", () => {
    expect(
      isWorkdayApplyStepUrl(
        "https://cvshealth.wd1.myworkdayjobs.com/CVS_Health_Careers/job/TX/Lead-Director_R0942300/apply",
      ),
    ).toBe(true);
  });

  it("parses title slug from posting URL", () => {
    expect(
      parseWorkdayTitleFromUrl(
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager--Program-Management_R-2522742",
      ),
    ).toContain("Senior Manager");
  });

  it("parses title slug from Workday /details/ URLs", () => {
    expect(
      parseWorkdayTitleFromUrl(
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1?q=manager",
      ),
    ).toContain("Senior Manager");
  });

  it("parses company segment from career site path", () => {
    expect(
      parseWorkdayCompanyFromUrl(
        "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/example",
      ),
    ).toBe("Walmart External");
  });

  it("parses camelCase Workday site segment without splitting brand names", () => {
    expect(
      parseWorkdayCompanyFromUrl(
        "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346?source=LinkedIn",
      ),
    ).toBe("iRhythm");
    expect(humanizeWorkdaySiteName("iRhythm")).toBe("iRhythm");
  });

  it("parses myworkdaysite.com recruiting URLs (Fidelity-style tenant)", () => {
    const fidelityUrl =
      "https://wd1.myworkdaysite.com/en-US/recruiting/fmr/FidelityCareers/job/Merrimack-NH/Director--AI-ML-and-Data-Architecture_2127738";
    expect(parseWorkdayCompanyFromUrl(fidelityUrl)).toBe("Fidelity Careers");
    expect(parseWorkdayTitleFromUrl(fidelityUrl)).toContain("Director");
    expect(humanizeWorkdaySiteName("FidelityCareers")).toBe("Fidelity");
  });
});
