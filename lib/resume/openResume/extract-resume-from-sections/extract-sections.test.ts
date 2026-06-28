import { describe, expect, it } from "vitest";
import type { ResumeSectionToLines, TextItem } from "@/lib/resume/openResume/types";
import { extractWorkExperience } from "@/lib/resume/openResume/extract-resume-from-sections/extract-work-experience";
import { extractEducation } from "@/lib/resume/openResume/extract-resume-from-sections/extract-education";
import { extractProject } from "@/lib/resume/openResume/extract-resume-from-sections/extract-project";

function item(text: string, x = 0, y = 0, fontName = "Arial", width = 120): TextItem {
  return { text, x, y, width, height: 12, fontName, hasEOL: true };
}

describe("extractWorkExperience", () => {
  it("extracts job entries from experience section", () => {
    const sections: ResumeSectionToLines = {
      "PROFESSIONAL EXPERIENCE": [
        [item("Senior Engineer", 0, 100, "Helvetica-Bold"), item("Jan 2020 – Present", 200, 100)],
        [item("Acme Corp — San Francisco, CA", 0, 92)],
        [item("• Built APIs", 0, 84)],
      ],
    };
    const { workExperiences } = extractWorkExperience(sections);
    expect(workExperiences.length).toBeGreaterThan(0);
    expect(workExperiences[0].descriptions.length).toBeGreaterThan(0);
  });
});

describe("extractEducation", () => {
  it("extracts school and degree", () => {
    const sections: ResumeSectionToLines = {
      EDUCATION: [
        [item("UC Berkeley", 0, 100, "Helvetica-Bold"), item("2016", 200, 100)],
        [item("B.S. Computer Science", 0, 92)],
      ],
    };
    const { educations } = extractEducation(sections);
    expect(educations.length).toBeGreaterThan(0);
    expect(educations[0].school || educations[0].degree).toBeTruthy();
  });
});

describe("extractProject", () => {
  it("extracts project subsection", () => {
    const sections: ResumeSectionToLines = {
      PROJECTS: [
        [item("Portfolio Site", 0, 100, "Helvetica-Bold"), item("2021", 200, 100)],
        [item("• Built with Next.js", 0, 92)],
      ],
    };
    const { projects } = extractProject(sections);
    expect(projects.length).toBeGreaterThan(0);
  });
});
