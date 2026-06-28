import { describe, expect, it } from "vitest";
import type { Resume } from "@/lib/resume/openResume/types";
import {
  openResumeToStructured,
  splitFullName,
  structuredFullName,
} from "@/lib/resume/openResume/adapter";

const RESUME: Resume = {
  profile: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "(415) 555-0100",
    url: "linkedin.com/in/jane",
    summary: "Engineer",
    location: "San Francisco, CA",
  },
  workExperiences: [
    {
      company: "Acme",
      jobTitle: "Engineer",
      date: "2020 – Present",
      descriptions: ["Built APIs"],
    },
  ],
  educations: [{ school: "UC Berkeley", degree: "B.S.", date: "2016", gpa: "", descriptions: [] }],
  projects: [{ project: "Side App", date: "2021", descriptions: ["Shipped MVP"] }],
  skills: {
    featuredSkills: [{ skill: "TypeScript", rating: 4 }],
    descriptions: ["Python, AWS"],
  },
  custom: { descriptions: ["AWS Certified"] },
};

describe("openResume adapter", () => {
  it("splitFullName splits first and remainder", () => {
    expect(splitFullName("Jane Marie Doe")).toEqual({
      firstName: "Jane",
      lastName: "Marie Doe",
    });
    expect(splitFullName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
  });

  it("openResumeToStructured maps resume model", () => {
    const structured = openResumeToStructured(RESUME);
    expect(structured.name).toBe("Jane Doe");
    expect(structured.experience[0].company).toBe("Acme");
    expect(structured.skills).toEqual(expect.arrayContaining(["TypeScript", "Python", "AWS"]));
    expect(structured.certifications).toContain("AWS Certified");
  });

  it("structuredFullName returns trimmed name", () => {
    expect(structuredFullName({ ...openResumeToStructured(RESUME), name: "  Jane  " })).toBe(
      "Jane",
    );
    expect(structuredFullName(openResumeToStructured({ ...RESUME, profile: { ...RESUME.profile, name: "" } }))).toBe("");
  });
});
