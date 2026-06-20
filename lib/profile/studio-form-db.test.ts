import { describe, expect, it } from "vitest";
import {
  hubFormToArchitectureContent,
  hubRefineryFormFromProfile,
  studioSkillsFromForm,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import type { ProfileWithArchitecture } from "@/lib/profile/resume-profile-core";

function mockProfile(
  overrides: Partial<ProfileWithArchitecture> = {},
): ProfileWithArchitecture {
  return {
    id: "profile-1",
    userId: "user-1",
    isDefault: true,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+1 555-0100",
    city: "Austin",
    country: "TX",
    targetTitle: "Senior Manager",
    minSalary: null,
    workMode: null,
    summary: "Leader with 10 years experience.",
    coreCompetencies: ["Leadership"],
    skills: ["Python", "SQL"],
    resumeRawText: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    architecture: {
      id: "arch-1",
      profileId: "profile-1",
      targetRole: "Senior Manager",
      calibrationScore: 0,
      content: {
        linkedIn: "linkedin.com/in/jane",
        skills: ["Python", "SQL", "Agile"],
        experiences: [
          {
            title: "Manager",
            company: "Acme",
            location: "Austin, TX",
            dateRange: "Jan 2020 – Present",
            bullets: ["Led team of 8"],
          },
        ],
        education: [
          {
            school: "State University",
            degree: "BS Computer Science",
            location: "",
            date: "2012 – 2016",
          },
        ],
        certifications: ["PMP"],
        projects: ["Platform rebuild"],
        languages: ["English — Native"],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

describe("hubRefineryFormFromProfile", () => {
  it("hydrates studio form from profile and architecture JSON", () => {
    const form = hubRefineryFormFromProfile(mockProfile());

    expect(form.firstName).toBe("Jane");
    expect(form.email).toBe("jane@example.com");
    expect(form.linkedIn).toBe("linkedin.com/in/jane");
    expect(form.experience[0]?.title).toBe("Manager");
    expect(form.education[0]?.school).toBe("State University");
    expect(form.certifications[0]?.text).toBe("PMP");
    expect(studioSkillsFromForm(form)).toEqual(["Python", "SQL", "Agile"]);
  });

  it("prefers architecture target role for list naming", () => {
    const profile = mockProfile({
      targetTitle: null,
      architecture: {
        ...mockProfile().architecture!,
        targetRole: "Director",
      },
    });

    expect(targetTitleFromProfile(profile)).toBe("Director");
  });
});

describe("hubFormToArchitectureContent", () => {
  it("writes onboarding-compatible content keys", () => {
    const form = hubRefineryFormFromProfile(mockProfile());
    const content = hubFormToArchitectureContent(form, ["Python", "SQL"]);

    expect(Array.isArray(content.experiences)).toBe(true);
    expect(Array.isArray(content.education)).toBe(true);
    expect(content.certifications).toEqual(["PMP"]);
    expect(content.languages).toEqual(["English — Native"]);
  });
});
