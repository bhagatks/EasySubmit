import { describe, expect, it } from "vitest";
import {
  parseLinkedInCompanyFromDoc,
  scrapeLinkedInDescription,
} from "@/src/shared/extension/linkedin-helpers";
import { parseJobDescriptionFromJsonLd } from "@/src/shared/extension/scrape-helpers";
import { buildScrapeDocument } from "@/lib/extension/test-fixtures/scrape-doc-builder";

const LONG_JD =
  "Job Description\n\nResponsibilities\n\nQualifications\n\nRequirements\n\n" +
  "We are seeking a talented professional to join our team and deliver high-quality outcomes. ".repeat(
    8,
  );

describe("parseLinkedInCompanyFromDoc", () => {
  it("parses company from the first og:title segment only", () => {
    const doc = buildScrapeDocument({
      url: "https://www.linkedin.com/jobs/view/123/",
      ogTitle: "Senior Data Engineer at Microsoft | LinkedIn",
    });
    expect(parseLinkedInCompanyFromDoc(doc)).toBe("Microsoft");
  });

  it("does not treat Work at Home as company on Phenom-style og titles", () => {
    const doc = buildScrapeDocument({
      url: "https://jobs.cvshealth.com/us/en/job/R0942300/example",
      ogTitle:
        "Lead Director, Software Development Engineering in Work at Home, Texas, United States | Innovation and Technology at CVS Health Job",
    });
    expect(parseLinkedInCompanyFromDoc(doc)).toBeNull();
  });
});

describe("scrapeLinkedInDescription", () => {
  it("reads description from show-more-less markup", () => {
    const doc = buildScrapeDocument({
      url: "https://www.linkedin.com/jobs/view/4402828483/",
      elements: {
        ".show-more-less-html__markup": LONG_JD,
      },
    });
    expect(scrapeLinkedInDescription(doc)).toContain("Job Description");
    expect(scrapeLinkedInDescription(doc).length).toBeGreaterThanOrEqual(120);
  });

  it("reads description from expandable-text-box test id", () => {
    const doc = buildScrapeDocument({
      url: "https://www.linkedin.com/jobs/view/4402828483/",
      elements: {
        "[data-testid='expandable-text-box']": LONG_JD,
      },
    });
    expect(scrapeLinkedInDescription(doc).length).toBeGreaterThanOrEqual(120);
  });
});

describe("parseJobDescriptionFromJsonLd", () => {
  it("extracts JobPosting.description from JSON-LD", () => {
    const doc = buildScrapeDocument({
      url: "https://www.linkedin.com/jobs/view/4402828483/",
      jsonLd: [
        JSON.stringify({
          "@type": "JobPosting",
          description: `<p>${LONG_JD}</p>`,
        }),
      ],
    });
    expect(parseJobDescriptionFromJsonLd(doc)).toContain("Job Description");
    expect(parseJobDescriptionFromJsonLd(doc).length).toBeGreaterThanOrEqual(120);
  });
});
