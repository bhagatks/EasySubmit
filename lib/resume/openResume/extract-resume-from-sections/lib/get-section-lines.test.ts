import { describe, expect, it } from "vitest";
import type { ResumeSectionToLines } from "@/lib/resume/openResume/types";
import { getSectionLinesByKeywords } from "@/lib/resume/openResume/extract-resume-from-sections/lib/get-section-lines";

describe("getSectionLinesByKeywords", () => {
  it("returns lines for the first matching section name", () => {
    const sections: ResumeSectionToLines = {
      profile: [[{ text: "Jane Doe", x: 0, y: 0, width: 1, height: 1, fontName: "Arial", hasEOL: true }]],
      skills: [[{ text: "Python", x: 0, y: 0, width: 1, height: 1, fontName: "Arial", hasEOL: true }]],
    };
    expect(getSectionLinesByKeywords(sections, ["skill"])).toEqual(sections.skills);
  });

  it("matches keyword substrings case-insensitively via section key", () => {
    const sections: ResumeSectionToLines = {
      certifications: [[{ text: "AWS SA", x: 0, y: 0, width: 1, height: 1, fontName: "Arial", hasEOL: true }]],
    };
    expect(getSectionLinesByKeywords(sections, ["certification"])).toEqual(sections.certifications);
  });

  it("returns empty array when no section matches", () => {
    expect(getSectionLinesByKeywords({}, ["experience"])).toEqual([]);
  });
});
