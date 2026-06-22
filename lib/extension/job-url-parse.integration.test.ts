import { describe, expect, it } from "vitest";
import {
  parseCareersOgTitleMeta,
  parseDocumentTitleCareersMeta,
} from "@/src/shared/extension/careers-og-meta";
import {
  parseIcimsJobFromUrl,
  parseJobTitleFromUrl,
  parseLocationFromJobUrl,
} from "@/src/shared/extension/job-url-parse";
import { REPORTED_JOB_URLS } from "@/lib/extension/test-fixtures/reported-job-urls";

describe("parseIcimsJobFromUrl", () => {
  it("parses Optimum title and location from slug", () => {
    const parsed = parseIcimsJobFromUrl(REPORTED_JOB_URLS.optimum);
    expect(parsed?.title).toBe("Manager Software Engineering");
    expect(parsed?.location).toBe("Plano, TX 75024");
  });
});

describe("parseJobTitleFromUrl — reported URLs", () => {
  it("parses all reported careers URLs", () => {
    expect(parseJobTitleFromUrl(REPORTED_JOB_URLS.walmartDetails)).toContain("Senior Manager");
    expect(parseJobTitleFromUrl(REPORTED_JOB_URLS.cvs)).toContain("Lead Director");
    expect(parseJobTitleFromUrl(REPORTED_JOB_URLS.optimum)).toContain("Manager Software Engineering");
  });

  it("parses Optimum location from URL", () => {
    expect(parseLocationFromJobUrl(REPORTED_JOB_URLS.optimum)).toBe("Plano, TX 75024");
  });
});

describe("careers title parsers", () => {
  it("parses CVS Phenom og:title", () => {
    const result = parseCareersOgTitleMeta(
      "Lead Director, Software Development Engineering in Work at Home, Texas, United States | Innovation and Technology at CVS Health Job",
    );
    expect(result.company).toBe("CVS Health");
    expect(result.location).toMatch(/Texas/i);
  });

  it("parses Slalom document.title", () => {
    const result = parseDocumentTitleCareersMeta(
      "Director - Software Engineering (Charlotte) - 1959 - Slalom",
    );
    expect(result.company).toBe("Slalom");
    expect(result.title).toContain("Director");
    expect(result.location).toMatch(/Charlotte/i);
  });
});
