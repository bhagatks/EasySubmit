import { describe, expect, it } from "vitest";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import { enrichScrapedJobMetadata } from "@/src/shared/extension/scrape-enrichment";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

const WALMART_URL =
  "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager_R-2522742";

function workdayDoc(html: string): Document {
  return {
    body: { innerText: html },
    title: "Senior Manager — Walmart",
    querySelector: (sel: string) => {
      if (sel === "h1") return { textContent: "Senior Manager" };
      if (sel.includes("jobPostingPage") || sel === "main") return { textContent: html };
      return null;
    },
    querySelectorAll: () => [],
    defaultView: { location: { href: WALMART_URL } },
  } as unknown as Document;
}

describe("detectJobPage workday confidence", () => {
  it("prefers workday adapter over generic on tenant URLs", () => {
    const result = detectJobPage(workdayDoc("x".repeat(120)), WALMART_URL, config);
    expect(result?.metadata.platform).toBe("workday");
  });
});

describe("enrichScrapedJobMetadata workday apply step", () => {
  it("sets scrapeWarning when apply-step page lacks description", () => {
    const applyUrl =
      "https://cvshealth.wd1.myworkdayjobs.com/CVS_Health_Careers/job/TX/Lead-Director_R0942300/apply";
    const emptyDoc = {
      title: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    const { metadata, enrichments } = enrichScrapedJobMetadata(emptyDoc, applyUrl, {
      title: "Lead Director",
      company: "CVS Health",
      location: null,
      salaryText: null,
      description: "short",
      platform: "workday",
      confidence: 70,
    });

    expect(metadata.scrapeWarning).toContain("posting");
    expect(enrichments).toContain("workday.apply_step.description_hint");
  });
});
