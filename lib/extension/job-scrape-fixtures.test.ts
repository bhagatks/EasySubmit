import { describe, expect, it } from "vitest";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@/src/shared/extension/force-metadata";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";
import { REPORTED_JOB_URLS } from "@/lib/extension/test-fixtures/reported-job-urls";
import { buildScrapeDocument } from "@/lib/extension/test-fixtures/scrape-doc-builder";

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["linkedin", "indeed", "greenhouse", "workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

describe("detectJobPage — reported careers URLs (legacy smoke)", () => {
  it("detects Workday /details/ URLs before SPA hydration", () => {
    const doc = buildScrapeDocument({ url: REPORTED_JOB_URLS.walmartDetails });
    const result = detectJobPage(doc, REPORTED_JOB_URLS.walmartDetails, config);
    expect(result?.metadata.platform).toBe("workday");
    expect(result?.metadata.title).toContain("Senior Manager");
    expect(result?.metadata.company).toMatch(/Walmart/i);
  });

  it("detects CVS Phenom postings from URL slug when DOM is empty", () => {
    const doc = buildScrapeDocument({ url: REPORTED_JOB_URLS.cvs });
    const result = detectJobPage(doc, REPORTED_JOB_URLS.cvs, config);
    expect(result?.metadata.title).toContain("Lead Director");
    expect(result?.metadata.company).toBe("CVS Health");
  });

  it("detects Optimum iCIMS postings from URL slug when DOM is empty", () => {
    const doc = buildScrapeDocument({ url: REPORTED_JOB_URLS.optimum });
    const result = detectJobPage(doc, REPORTED_JOB_URLS.optimum, config);
    expect(result?.metadata.title).toContain("Manager Software Engineering");
    expect(result?.metadata.company).toBe("Optimum");
    expect(result?.metadata.location).toBe("Plano, TX 75024");
  });

  it("detects Slalom JobDetail pages via document title fallback", () => {
    const doc = buildScrapeDocument({
      url: REPORTED_JOB_URLS.slalom,
      documentTitle: "Director - Software Engineering (Charlotte) - 1959 - Slalom",
    });
    const metadata = buildFallbackJobMetadata(doc, REPORTED_JOB_URLS.slalom, config);
    expect(metadata.company).toBe("Slalom");
    expect(metadata.title).toContain("Director");
  });

  it("detects LinkedIn URLs with og:title company fallback", () => {
    const doc = buildScrapeDocument({
      url: REPORTED_JOB_URLS.linkedin,
      ogTitle: "Senior Data Engineer at Microsoft | LinkedIn",
      h1: "Senior Data Engineer",
    });
    const result = detectJobPage(doc, REPORTED_JOB_URLS.linkedin, config);
    expect(result).not.toBeNull();
    expect(result?.metadata.company).toBe("Microsoft");
  });
});
