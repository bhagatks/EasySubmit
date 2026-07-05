/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import {
  isGenericNavigationJobTitle,
  scrapeLocation,
  scrapeTitle,
  stripJobDescriptionFooterNoise,
} from "@shared/extension/scrape-helpers";

describe("isGenericNavigationJobTitle", () => {
  it("flags hub labels", () => {
    expect(isGenericNavigationJobTitle("Jobs")).toBe(true);
    expect(isGenericNavigationJobTitle("Careers")).toBe(true);
    expect(isGenericNavigationJobTitle("Job Search")).toBe(true);
  });

  it("allows real role titles", () => {
    expect(isGenericNavigationJobTitle("Software Engineer")).toBe(false);
    expect(isGenericNavigationJobTitle("Sr. Product Manager")).toBe(false);
  });
});

describe("scrapeTitle", () => {
  it("skips generic h1 and uses a specific fallback selector", () => {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = `
      <h1>Jobs</h1>
      <div class="job-title">Staff Engineer</div>
    `;
    expect(scrapeTitle(doc, [".job-title"])).toBe("Staff Engineer");
  });
});

describe("stripJobDescriptionFooterNoise", () => {
  it("removes privacy and EEO footer blocks", () => {
    const noisy =
      "Lead platform engineering teams across cloud-native systems and API programs. " +
      "Privacy Notice We collect personal data for recruiting. " +
      "Equal Employment Opportunity We are an equal opportunity employer.";
    const cleaned = stripJobDescriptionFooterNoise(noisy);
    expect(cleaned.toLowerCase()).not.toContain("privacy notice");
    expect(cleaned.toLowerCase()).not.toContain("equal employment");
    expect(cleaned).toContain("Lead platform engineering");
  });
});

describe("scrapeLocation", () => {
  it("ignores generic nav labels like Students", () => {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = `
      <div data-automation-id="location">Students</div>
      <div class="location">Merrimack, NH</div>
    `;
    expect(scrapeLocation(doc, ["[data-automation-id='location']", ".location"])).toBe(
      "Merrimack, NH",
    );
  });
});
