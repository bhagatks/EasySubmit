import { describe, expect, it } from "vitest";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { classifyJobPage, isJobPostingPage } from "@/src/shared/extension/page-classifier";
import { isJobPage } from "@/src/shared/extension/is-job-page";
import { fingerprintAtsFromUrl } from "@/src/shared/extension/ats-fingerprint";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";
import {
  NEGATIVE_DETECTION_URLS,
  POSITIVE_DETECTION_URLS,
} from "@/lib/extension/test-fixtures/negative-urls";
import { buildScrapeDocument } from "@/lib/extension/test-fixtures/scrape-doc-builder";

const emptyDoc = buildScrapeDocument({ url: "https://example.com" });

const config: ExtensionRuntimeConfig = {
  jobCardEnabled: true,
  enabledPlatforms: [
    "linkedin",
    "indeed",
    "greenhouse",
    "workday",
    "lever",
    "ashby",
    "icims",
    "smartrecruiters",
    "taleo",
    "jobvite",
    "generic",
  ],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

describe("page classifier — hub rejection (CVS bug class)", () => {
  it("classifies CVS careerareas as careers_hub", () => {
    const result = classifyJobPage(NEGATIVE_DETECTION_URLS.cvsCareerAreas);
    expect(result.kind).toBe("careers_hub");
    expect(result.reasons).toContain("path:careers_hub");
  });

  it("rejects hub pages through isJobPage and detectJobPage", () => {
    for (const [name, url] of Object.entries(NEGATIVE_DETECTION_URLS)) {
      expect(isJobPostingPage(url), name).toBe(false);
      expect(isJobPage(emptyDoc, url), name).toBe(false);
      expect(detectJobPage(emptyDoc, url, config), name).toBeNull();
    }
  });

  it("allows CVS real job posting paths", () => {
    const url = POSITIVE_DETECTION_URLS.cvsJob;
    expect(classifyJobPage(url).kind).toBe("job_posting");
    expect(isJobPage(emptyDoc, url)).toBe(true);
    expect(detectJobPage(emptyDoc, url, config)).not.toBeNull();
  });
});

describe("ATS fingerprint — phase 1 platforms", () => {
  it("maps lever and ashby URLs to dedicated platforms", () => {
    expect(fingerprintAtsFromUrl(POSITIVE_DETECTION_URLS.lever).suggestedPlatform).toBe("lever");
    expect(fingerprintAtsFromUrl(POSITIVE_DETECTION_URLS.ashby).suggestedPlatform).toBe("ashby");
  });
});

describe("hub page with misleading DOM (Apply + marketing copy)", () => {
  it("still rejects CVS careerareas even with apply buttons and long body", () => {
    const doc = buildScrapeDocument({
      url: NEGATIVE_DETECTION_URLS.cvsCareerAreas,
      h1: "Careers",
      bodyText:
        "It takes a lot of heart to advance the future of health care. Benefits Inclusion Belonging. ".repeat(
          20,
        ),
      elements: {
        "a[href*='benefits']": "Benefits",
      },
      buttons: ["Apply", "Search Jobs"],
    });

    expect(classifyJobPage(NEGATIVE_DETECTION_URLS.cvsCareerAreas, doc).kind).toBe("careers_hub");
    expect(detectJobPage(doc, NEGATIVE_DETECTION_URLS.cvsCareerAreas, config)).toBeNull();
  });
});
