import { describe, expect, it } from "vitest";
import {
  humanizeWorkdaySiteName,
  parsePrimaryLocationFromDescription,
  parseWorkdayCompanyFromUrl,
  scrapeWorkdayCompany,
  scrapeWorkdayLocations,
  scrapeWorkdaySalary,
} from "@/src/shared/extension/workday-helpers";

const WALMART_DETAILS_URL =
  "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1?q=manager";

function walmartDoc(html: string): Document {
  return {
    body: { innerText: html },
    querySelector: (sel: string) => {
      if (sel === "[data-automation-id='company']") return null;
      if (sel === "[data-automation-id='subtitle']") {
        return { textContent: "R-2485191" };
      }
      if (sel === "[data-automation-id='compensationText']") return null;
      return null;
    },
    querySelectorAll: (sel: string) => {
      if (sel.includes("location")) {
        return [
          { textContent: "Bentonville, AR" },
          { textContent: "Dallas, TX" },
          { textContent: "4 Locations" },
        ];
      }
      return [];
    },
    defaultView: { location: { href: WALMART_DETAILS_URL } },
  } as unknown as Document;
}

describe("Workday company + location scrape", () => {
  it("maps WalmartExternal site segment to Walmart", () => {
    expect(parseWorkdayCompanyFromUrl(WALMART_DETAILS_URL)).toBe("Walmart External");
    expect(humanizeWorkdaySiteName("Walmart External")).toBe("Walmart");
  });

  it("ignores requisition id in subtitle and uses career site name", () => {
    const company = scrapeWorkdayCompany(walmartDoc(""), WALMART_DETAILS_URL);
    expect(company).toBe("Walmart");
  });

  it("joins multiple Workday locations with commas and skips count summaries", () => {
    const location = scrapeWorkdayLocations(walmartDoc(""), null);
    expect(location).toBe("Bentonville, AR, Dallas, TX");
  });

  it("falls back to Primary Location from job description", () => {
    const description =
      "Benefits text…Primary Location...806 Excellence Dr, Bentonville, AR 72716, United States of America";
    const emptyDoc = {
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    expect(parsePrimaryLocationFromDescription(description)).toContain("Bentonville, AR");
    expect(scrapeWorkdayLocations(emptyDoc, description)).toContain("Bentonville, AR");
  });

  it("captures salary range from Workday description text", () => {
    const description =
      "The annual salary range for this position is $80,000.00 - $155,000.00";
    const emptyDoc = {
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    expect(scrapeWorkdaySalary(emptyDoc, description)).toBe("$80,000.00 - $155,000.00");
  });
});
