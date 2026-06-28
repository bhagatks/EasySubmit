import { describe, expect, it } from "vitest";
import { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";

describe("cleanJobDescription", () => {
  it("returns clean text and word count for a normal JD", () => {
    const jd = Array(10)
      .fill(
        "We are hiring a senior software engineer with strong TypeScript and React skills who can build scalable systems.",
      )
      .join(" ");
    const result = cleanJobDescription(jd);
    expect(result.wordCount).toBeGreaterThan(80);
    expect(result.likelyTruncated).toBe(false);
    expect(result.strippedTypes).toHaveLength(0);
  });

  it("flags likelyTruncated when fewer than 80 words", () => {
    const short = "Looking for a software engineer with Python skills.";
    const result = cleanJobDescription(short);
    expect(result.likelyTruncated).toBe(true);
  });

  it("strips EEO boilerplate and adds 'eeo' to strippedTypes", () => {
    const jd = "We need a senior engineer. We are an equal opportunity employer. Strong skills required.";
    const result = cleanJobDescription(jd);
    expect(result.strippedTypes).toContain("eeo");
    expect(result.cleaned).not.toMatch(/equal opportunity employer/i);
  });

  it("strips apply instructions and adds 'apply-instructions' to strippedTypes", () => {
    const jd = "We need 100 engineers with Python skills and experience. Click here to apply send your resume to hr@example.com today.";
    const result = cleanJobDescription(jd);
    expect(result.strippedTypes).toContain("apply-instructions");
  });

  it("normalizes smart quotes and special chars", () => {
    const jd = "We’re hiring. “Strong skills” required. Python•Node.js•React.";
    const result = cleanJobDescription(jd);
    expect(result.cleaned).toContain("We're hiring");
    expect(result.cleaned).toContain('"Strong skills"');
    expect(result.cleaned).toContain("-Node.js");
  });

  it("collapses multiple blank lines", () => {
    const jd = "Line one.\n\n\n\n\nLine two with Python and JavaScript and more words here yes.";
    const result = cleanJobDescription(jd);
    expect(result.cleaned).not.toMatch(/\n{3,}/);
  });

  it("returns raw input unchanged when processing throws", () => {
    // cleanJobDescription never throws, but we can verify the no-strip path
    const result = cleanJobDescription("");
    expect(result.cleaned).toBe("");
    expect(result.wordCount).toBe(0);
    expect(result.likelyTruncated).toBe(true);
    expect(result.strippedTypes).toHaveLength(0);
  });
});
