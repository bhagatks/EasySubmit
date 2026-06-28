import { describe, expect, it } from "vitest";
import type { ResumeSectionToLines, TextItem } from "@/lib/resume/openResume/types";
import { extractSkills } from "@/lib/resume/openResume/extract-resume-from-sections/extract-skills";
import { extractCertifications } from "@/lib/resume/openResume/extract-resume-from-sections/extract-certifications";

function item(text: string): TextItem {
  return { text, x: 0, y: 0, width: 100, height: 12, fontName: "Arial", hasEOL: true };
}

describe("extractSkills", () => {
  it("extracts bullet skills from skills section", () => {
    const sections: ResumeSectionToLines = {
      skills: [
        [item("• Python")],
        [item("• AWS")],
        [item("• Docker")],
      ],
    };
    const { skills } = extractSkills(sections);
    expect(skills.descriptions).toEqual(expect.arrayContaining(["Python", "AWS", "Docker"]));
    expect(skills.featuredSkills).toHaveLength(6);
  });

  it("falls back to profile colon-prefixed skills", () => {
    const sections: ResumeSectionToLines = {
      profile: [
        [item("Jane Doe")],
        [item("jane@example.com")],
        [item("Languages: Python, Go")],
      ],
    };
    const { skills } = extractSkills(sections);
    expect(skills.descriptions.length).toBeGreaterThan(0);
  });
});

describe("extractCertifications", () => {
  it("returns empty array when section missing", () => {
    expect(extractCertifications({})).toEqual([]);
  });

  it("extracts certification bullets", () => {
    const sections: ResumeSectionToLines = {
      certifications: [
        [item("• AWS Solutions Architect")],
        [item("• PMP")],
      ],
    };
    expect(extractCertifications(sections)).toEqual([
      "AWS Solutions Architect",
      "PMP",
    ]);
  });
});
