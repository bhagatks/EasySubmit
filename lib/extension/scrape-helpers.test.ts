/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { isGenericNavigationJobTitle, scrapeTitle } from "@shared/extension/scrape-helpers";

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
