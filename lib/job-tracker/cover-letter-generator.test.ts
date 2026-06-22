import { describe, expect, it } from "vitest";
import {
  extractJobAndResumeContext,
  flattenJobAndResumeContext,
} from "@/lib/job-tracker/extract-job-resume-context";
import {
  assembleCoverLetterMarkdown,
  generateCoverLetter,
  hashCoverLetterSeed,
  selectCoverLetterTemplateIndices,
} from "@/lib/job-tracker/cover-letter-generator";

const SAMPLE_RESUME = `
# Ada Lovelace
ada.lovelace@example.com
San Francisco, CA

## Skills
TypeScript, React, PostgreSQL

## Experience
Senior Software Engineer at Analytical Engines Inc
Jan 2022 – Present
`.trim();

const SAMPLE_JD = `
Acme Corp
Senior Software Engineer

About Acme Corp
We need TypeScript and PostgreSQL experience.
`.trim();

describe("cover-letter-generator", () => {
  const parsed = extractJobAndResumeContext(SAMPLE_RESUME, SAMPLE_JD);

  it("hash is stable for the same company seed", () => {
    expect(hashCoverLetterSeed("Acme Corp")).toBe(hashCoverLetterSeed("acme corp"));
    expect(hashCoverLetterSeed("Acme Corp")).not.toBe(hashCoverLetterSeed("Globex"));
  });

  it("selects deterministic indices per company", () => {
    const a = selectCoverLetterTemplateIndices("Acme Corp");
    const b = selectCoverLetterTemplateIndices("Acme Corp");
    const c = selectCoverLetterTemplateIndices("Other Co");

    expect(a).toEqual(b);
    expect([a.opening, a.experienceBlock, a.whyCompany, a.closing].every((n) => n >= 0 && n <= 2)).toBe(
      true,
    );
    expect(a).not.toEqual(c);
  });

  it("generates markdown from parser output", () => {
    const result = generateCoverLetter({
      resumeData: parsed.resume,
      jdData: parsed.job,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.markdown).toContain("Ada Lovelace");
    expect(result.markdown).toContain("Acme Corp");
    expect(result.markdown).toContain("Senior Software Engineer");
    expect(result.markdown).toContain("TypeScript");
    expect(result.markdown).toContain("Sincerely,");
    expect(result.markdown).not.toContain("${");
    expect(result.composition.openingId).toMatch(/^opening-/);
  });

  it("returns the same letter for the same company on repeat calls", () => {
    const first = generateCoverLetter({ resumeData: parsed.resume, jdData: parsed.job });
    const second = generateCoverLetter({ resumeData: parsed.resume, jdData: parsed.job });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.markdown).toBe(second.markdown);
    expect(first.indices).toEqual(second.indices);
  });

  it("handles missing input with error codes", () => {
    expect(generateCoverLetter(null).code).toBe("invalid_input");
    expect(
      generateCoverLetter({ resumeData: parsed.resume, jdData: undefined as never }).code,
    ).toBe("missing_jd");
  });

  it("assembles contact header and signature in markdown", () => {
    const body = "Dear team,\n\nBody paragraph.";
    const md = assembleCoverLetterMarkdown({ body, resumeData: parsed.resume });

    expect(md).toMatch(/^Ada Lovelace/);
    expect(md).toContain("ada.lovelace@example.com");
    expect(md).toContain(body);
    expect(md).toContain("Sincerely,\nAda Lovelace");
  });

  it("integrates with flattened parser context fields", () => {
    const flat = flattenJobAndResumeContext(parsed);
    expect(flat.companyName).toBe("Acme Corp");
    expect(flat.topSkills[0]).toBe("TypeScript");
  });
});
