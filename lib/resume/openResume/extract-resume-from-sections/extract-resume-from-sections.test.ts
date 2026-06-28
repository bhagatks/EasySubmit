import { describe, expect, it } from "vitest";
import type { ResumeSectionToLines, TextItem } from "@/lib/resume/openResume/types";
import { extractResumeFromSections } from "@/lib/resume/openResume/extract-resume-from-sections/index";
import {
  matchEmail,
  matchPhone,
} from "@/lib/resume/openResume/extract-resume-from-sections/extract-profile";

function item(text: string, y = 0, fontName = "Arial"): TextItem {
  return { text, x: 0, y, width: 200, height: 12, fontName, hasEOL: true };
}

describe("extract-profile matchers", () => {
  it("matchEmail finds email tokens", () => {
    expect(matchEmail(item("jane@example.com"))).toBeTruthy();
    expect(matchEmail(item("not-email"))).toBeNull();
  });

  it("matchPhone finds phone patterns", () => {
    expect(matchPhone(item("(415) 555-0100"))).toBeTruthy();
  });
});

describe("extractResumeFromSections", () => {
  it("assembles resume from grouped section lines", () => {
    const sections: ResumeSectionToLines = {
      profile: [
        [item("Jane Doe", 200, "Helvetica-Bold")],
        [item("jane@example.com", 190)],
        [item("(415) 555-0100", 180)],
      ],
      skills: [[item("• Python")], [item("• AWS")]],
      "PROFESSIONAL EXPERIENCE": [
        [item("Engineer", 150, "Helvetica-Bold"), item("Jan 2020 – Present", 200)],
        [item("• Built APIs", 140)],
      ],
      EDUCATION: [
        [item("UC Berkeley", 110, "Helvetica-Bold"), item("2016", 200)],
        [item("B.S. Computer Science", 100)],
      ],
    };

    const resume = extractResumeFromSections(sections);
    expect(resume.skills.descriptions.length).toBeGreaterThan(0);
    expect(resume.workExperiences.length + resume.educations.length).toBeGreaterThan(0);
  });
});
