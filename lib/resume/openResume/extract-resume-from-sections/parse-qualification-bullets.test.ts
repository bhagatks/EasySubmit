import { describe, expect, it } from "vitest";
import { parseQualificationBullets } from "@/lib/resume/openResume/extract-resume-from-sections/parse-qualification-bullets";

describe("parseQualificationBullets", () => {
  it("parses education bullets", () => {
    const result = parseQualificationBullets([
      "B.S. Computer Science | UC Berkeley (2016)",
    ]);
    expect(result.educations).toHaveLength(1);
    expect(result.educations[0].degree).toContain("Computer Science");
    expect(result.educations[0].school).toContain("UC Berkeley");
    expect(result.educations[0].date).toBe("2016");
  });

  it("extracts skills from toolkit lines", () => {
    const result = parseQualificationBullets([
      "Technical skills: Python, AWS, Docker",
    ]);
    expect(result.skills).toEqual(expect.arrayContaining(["Python", "AWS", "Docker"]));
  });

  it("classifies certifications", () => {
    const result = parseQualificationBullets(["AWS Certified Solutions Architect"]);
    expect(result.certifications).toContain("AWS Certified Solutions Architect");
    expect(result.educations).toHaveLength(0);
  });

  it("routes university mentions to education", () => {
    const result = parseQualificationBullets(["MBA | Stanford University"]);
    expect(result.educations).toHaveLength(1);
    expect(result.educations[0].school).toContain("Stanford");
  });

  it("defaults unmatched bullets to certifications", () => {
    const result = parseQualificationBullets(["Scrum Master credential"]);
    expect(result.certifications).toContain("Scrum Master credential");
  });
});
