import { describe, expect, it } from "vitest";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { assessCaptureCompleteness } from "@/src/shared/extension/capture-fields";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";
import { REPORTED_JOB_URLS } from "@/lib/extension/test-fixtures/reported-job-urls";
import {
  buildScrapeDocument,
  type ScrapeDocFixture,
} from "@/lib/extension/test-fixtures/scrape-doc-builder";

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["linkedin", "indeed", "greenhouse", "workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

const LONG_JD =
  "Job Description\n\nResponsibilities\n\nQualifications\n\nRequirements\n\n" +
  "We are seeking a talented professional to join our team and deliver high-quality outcomes. ".repeat(
    8,
  );

function expectNoBlockingGaps(
  site: string,
  metadata: {
    title: string;
    company: string | null;
    location: string | null;
    salaryText: string | null;
    description: string | null;
    platform: string;
    confidence: number;
  },
  url: string,
) {
  const completeness = assessCaptureCompleteness({
    url,
    title: metadata.title,
    company: metadata.company,
    location: metadata.location,
    salaryText: metadata.salaryText,
    description: metadata.description,
    platform: metadata.platform,
    metadata: { confidence: metadata.confidence },
  });

  expect(completeness.missingBlockingQuality, `${site} blocking gaps`).toEqual([]);
  expect(metadata.company?.trim(), `${site} company`).toBeTruthy();
  expect(metadata.description?.length ?? 0, `${site} description`).toBeGreaterThanOrEqual(120);
  expect(metadata.title.trim(), `${site} title`).toBeTruthy();
}

function scrapeReportedJob(site: string, fixture: ScrapeDocFixture) {
  const doc = buildScrapeDocument(fixture);
  const result = detectJobPage(doc, fixture.url, config);
  expect(result, `${site} detectJobPage`).not.toBeNull();
  return result!;
}

describe("reported job URLs — hydrated page capture", () => {
  it("captures Slalom JobDetail with company, location, and description", () => {
    const result = scrapeReportedJob("slalom", {
      url: REPORTED_JOB_URLS.slalom,
      documentTitle: "Director - Software Engineering (Charlotte) - 1959 - Slalom",
      h1: "Director - Software Engineering (Charlotte)",
      bodyText: `Locations\n\n- Charlotte, NC\n\nDescription and Requirements\n\n${LONG_JD}`,
      buttons: ["Apply"],
    });

    expect(result.metadata.platform).toBe("generic");
    expect(result.metadata.company).toBe("Slalom");
    expect(result.metadata.location).toMatch(/Charlotte/i);
    expectNoBlockingGaps("slalom", result.metadata, REPORTED_JOB_URLS.slalom);
  });

  it("captures LinkedIn job view with company and description", () => {
    const result = scrapeReportedJob("linkedin", {
      url: REPORTED_JOB_URLS.linkedin,
      documentTitle: "Senior Data Engineer at Microsoft | LinkedIn",
      ogTitle: "Senior Data Engineer at Microsoft | LinkedIn",
      h1: "Senior Data Engineer",
      bodyText: LONG_JD,
      elements: {
        ".job-details-jobs-unified-top-card__company-name": "Microsoft",
        ".jobs-description__content": LONG_JD,
        ".job-details-jobs-unified-top-card__bullet": "Remote · United States",
      },
      buttons: ["Easy Apply"],
    });

    expect(result.metadata.platform).toBe("linkedin");
    expect(result.metadata.company).toBe("Microsoft");
    expectNoBlockingGaps("linkedin", result.metadata, REPORTED_JOB_URLS.linkedin);
  });

  it("captures LinkedIn description from show-more-less markup (2026 DOM)", () => {
    const url =
      "https://www.linkedin.com/jobs/view/4402828483/?alternateChannel=search&refId=abc";
    const result = scrapeReportedJob("linkedin-new-dom", {
      url,
      documentTitle: "Software Engineer at Example Corp | LinkedIn",
      ogTitle: "Software Engineer at Example Corp | LinkedIn",
      h1: "Software Engineer",
      elements: {
        ".show-more-less-html__markup": LONG_JD,
        ".job-details-jobs-unified-top-card__company-name": "Example Corp",
        ".job-details-jobs-unified-top-card__bullet": "San Francisco, CA",
      },
      buttons: ["Easy Apply"],
    });

    expect(result.metadata.description?.length ?? 0).toBeGreaterThanOrEqual(120);
    expectNoBlockingGaps("linkedin-new-dom", result.metadata, url);
  });

  it("captures LinkedIn description from JSON-LD when DOM is sparse", () => {
    const url = "https://www.linkedin.com/jobs/view/4402828483/";
    const result = scrapeReportedJob("linkedin-jsonld", {
      url,
      h1: "Software Engineer",
      ogTitle: "Software Engineer at Example Corp | LinkedIn",
      elements: {
        ".job-details-jobs-unified-top-card__company-name": "Example Corp",
      },
      jsonLd: [
        JSON.stringify({
          "@type": "JobPosting",
          title: "Software Engineer",
          description: `<p>${LONG_JD}</p>`,
        }),
      ],
      buttons: ["Easy Apply"],
    });

    expect(result.metadata.description?.length ?? 0).toBeGreaterThanOrEqual(120);
    expectNoBlockingGaps("linkedin-jsonld", result.metadata, url);
  });

  it("captures Optimum iCIMS posting with parsed title, company, location, and description", () => {
    const result = scrapeReportedJob("optimum", {
      url: REPORTED_JOB_URLS.optimum,
      h1: "Manager Software Engineering",
      bodyText: `Location:\n\nPlano, TX, US, 75024\n\nJob Summary\n\n${LONG_JD}`,
      elements: {
        ".iCIMS_JobHeaderHeading": "Manager Software Engineering",
        ".iCIMS_JobHeaderTag": "Plano, TX, US, 75024",
        ".iCIMS_InfoMsg": LONG_JD,
      },
      buttons: ["Apply now"],
    });

    expect(result.metadata.company).toBe("Optimum");
    expect(result.metadata.title).toContain("Manager Software Engineering");
    expect(result.metadata.location).toMatch(/Plano,\s*TX/i);
    expectNoBlockingGaps("optimum", result.metadata, REPORTED_JOB_URLS.optimum);
  });

  it("captures Walmart Workday /details/ posting", () => {
    const result = scrapeReportedJob("walmart", {
      url: REPORTED_JOB_URLS.walmartDetails,
      h1: "Senior Manager, Program Management",
      bodyText: LONG_JD,
      elements: {
        "[data-automation-id=company]": "Walmart",
        "[data-automation-id=location]": "Bentonville, AR",
        "[data-automation-id=jobDescriptionText]": LONG_JD,
      },
      buttons: ["Apply"],
    });

    expect(result.metadata.platform).toBe("workday");
    expect(result.metadata.title).toContain("Senior Manager");
    expect(result.metadata.company).toMatch(/Walmart/i);
    expectNoBlockingGaps("walmart", result.metadata, REPORTED_JOB_URLS.walmartDetails);
  });

  it("captures CVS Phenom posting from og:title and host fallback", () => {
    const result = scrapeReportedJob("cvs", {
      url: REPORTED_JOB_URLS.cvs,
      ogTitle:
        "Lead Director, Software Development Engineering in Work at Home, Texas, United States | Innovation and Technology at CVS Health Job",
      h1: "Lead Director, Software Development Engineering",
      bodyText: LONG_JD,
      elements: {
        "[data-ph-at-id=job-description-text]": LONG_JD,
      },
      buttons: ["Apply"],
    });

    expect(result.metadata.company).toBe("CVS Health");
    expect(result.metadata.location).toMatch(/Texas/i);
    expect(result.metadata.title).toContain("Lead Director");
    expectNoBlockingGaps("cvs", result.metadata, REPORTED_JOB_URLS.cvs);
  });
});

describe("reported job URLs — pre-hydration (URL + host fallbacks)", () => {
  it("still resolves company/title for careers hosts before SPA loads", () => {
    for (const [site, url] of [
      ["cvs", REPORTED_JOB_URLS.cvs],
      ["optimum", REPORTED_JOB_URLS.optimum],
      ["slalom", REPORTED_JOB_URLS.slalom],
      ["walmart", REPORTED_JOB_URLS.walmartDetails],
    ] as const) {
      const doc = buildScrapeDocument({ url });
      const result = detectJobPage(doc, url, config);
      expect(result, site).not.toBeNull();
      expect(result!.metadata.company?.trim(), `${site} company`).toBeTruthy();
      expect(result!.metadata.title?.trim(), `${site} title`).toBeTruthy();
    }
  });
});
