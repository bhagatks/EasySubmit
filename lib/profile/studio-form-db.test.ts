import { describe, expect, it } from "vitest";
import {
  hubFormToProfileContent,
  hubRefineryFormFromProfile,
  studioSkillsFromForm,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import type { ResumeProfile } from "@/lib/profile/resume-profile-core";

function mockProfile(overrides: Partial<ResumeProfile> = {}): ResumeProfile {
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
    summary: "Leader with 10 years experience.",
    skills: ["Python", "SQL"],
    resumeRawText: null,
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
    calibrationScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("hubRefineryFormFromProfile", () => {
  it("hydrates studio form from profile content JSON", () => {
    const form = hubRefineryFormFromProfile(mockProfile());

    expect(form.firstName).toBe("Jane");
    expect(form.email).toBe("jane@example.com");
    expect(form.linkedIn).toBe("https://linkedin.com/in/jane");
    expect(form.experience[0]?.title).toBe("Manager");
    expect(form.education[0]?.school).toBe("State University");
    expect(form.certifications[0]?.text).toBe("PMP");
    expect(studioSkillsFromForm(form)).toEqual(["Python", "SQL", "Agile"]);
  });

  it("repairs swapped experience title and company from corrupted profile content", () => {
    const form = hubRefineryFormFromProfile(
      mockProfile({
        summary: "7-Eleven with 20 years leading platform teams.",
        content: {
          experiences: [
            {
              title: "7-Eleven",
              company: "Head of Engineering | Sr. Engineering Manager",
              location: "",
              dateRange: "Jan 2024 – Present",
              bullets: ["Led platform delivery."],
            },
          ],
        },
      }),
    );

    expect(form.experience[0]?.title).toBe("Head of Engineering | Sr. Engineering Manager");
    expect(form.experience[0]?.company).toBe("7-Eleven");
    expect(form.professionalSummary).toBe(
      "Head of Engineering with 20 years leading platform teams.",
    );
  });

  it("uses profile targetTitle for list naming", () => {
    expect(targetTitleFromProfile(mockProfile({ targetTitle: "Director" }))).toBe(
      "Director",
    );
  });
});

describe("hubFormToProfileContent", () => {
  it("writes onboarding-compatible content keys", () => {
    const form = hubRefineryFormFromProfile(mockProfile());
    const content = hubFormToProfileContent(form, ["Python", "SQL"]);

    expect(Array.isArray(content.experiences)).toBe(true);
    expect(Array.isArray(content.education)).toBe(true);
    expect(content.certifications).toEqual(["PMP"]);
    expect(content.languages).toEqual(["English — Native"]);
  });

  it("hydrates contact fields from profile row with content JSON fallback", () => {
    const form = hubRefineryFormFromProfile(mockProfile());
    form.email = "new@example.com";
    form.phone = "+1 555-9999";
    form.linkedIn = "linkedin.com/in/new-handle";

    const content = hubFormToProfileContent(form, ["Python"]);

    expect(content.email).toBe("new@example.com");
    expect(content.phone).toBe("+1 555-9999");
    expect(content.linkedIn).toBe("https://linkedin.com/in/new-handle");
  });

  it("hydrates phone and linkedIn from content when profile columns are empty", () => {
    const hydrated = hubRefineryFormFromProfile(
      mockProfile({
        email: "",
        phone: null,
        content: {
          email: "legacy@example.com",
          phone: "+1 555-0100",
          linkedIn: "linkedin.com/in/legacy",
          skills: ["Python"],
        },
      }),
    );

    expect(hydrated.email).toBe("legacy@example.com");
    expect(hydrated.phone).toBe("+1 555-0100");
    expect(hydrated.linkedIn).toBe("https://linkedin.com/in/legacy");
  });

  it("round-trips page length preference in profile content", () => {
    const form = hubRefineryFormFromProfile(
      mockProfile({
        content: {
          ...(mockProfile().content as Record<string, unknown>),
          pageLengthPreference: "2",
        },
      }),
    );
    expect(form.pageLengthPreference).toBe("2");

    const content = hubFormToProfileContent(form, ["Python"]);
    expect(content.pageLengthPreference).toBe("2");
  });
});
