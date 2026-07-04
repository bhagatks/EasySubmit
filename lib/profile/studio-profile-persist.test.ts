import type { Prisma } from "@/lib/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  hubRefineryFormFromProfile,
  hubFormToProfileContent,
  normalizeLinkedInForStorage,
  studioSkillsFromForm,
} from "@/lib/profile/studio-form-db";
import type { ResumeProfile } from "@/lib/profile/resume-profile-core";
import { buildResumeProfileStudioPersistPayload } from "@/lib/profile/studio-profile-persist";

function fullForm(overrides: Partial<HubRefineryForm> = {}): HubRefineryForm {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Jane",
    lastName: "Doe",
    cityState: "Austin, TX",
    phone: "+1 (555) 010-0200",
    email: "jane@example.com",
    linkedIn: "linkedin.com/in/jane-doe",
    professionalSummary:
      "Experienced engineering leader with over fifteen years building platform teams, " +
      "data pipelines, and cloud-native systems at scale across retail and healthcare. " +
      "Known for driving modernization programs, mentoring managers, and partnering with " +
      "product and architecture stakeholders to deliver measurable business outcomes.",
    skillsText: "TypeScript, Node.js, PostgreSQL, React, AWS, Docker",
    experience: [
      {
        id: "exp-0",
        title: "Head of Engineering",
        company: "Acme Corp",
        location: "Austin, TX",
        startMonth: "Jan",
        startYear: "2020",
        endMonth: "",
        endYear: "Present",
        bullets: "Led platform modernization\nReduced defects by 35%",
        hidden: false,
      },
    ],
    education: [
      {
        id: "edu-0",
        degree: "BS Computer Science",
        school: "State University",
        location: "Austin, TX",
        startMonth: "Aug",
        startYear: "2004",
        endMonth: "May",
        endYear: "2008",
        hidden: false,
      },
    ],
    certifications: [{ id: "cert-0", text: "AWS Solutions Architect", hidden: false }],
    projects: [{ id: "proj-0", text: "Internal developer portal", hidden: false }],
    languages: [{ id: "lang-0", text: "English — Native", hidden: false }],
    customSections: [
      { id: "custom-0", title: "Leadership", content: "Mentored 12 engineers", hidden: false },
    ],
    pageLengthPreference: "2",
    ...overrides,
  };
}

function mockProfileFromPersist(
  payload: ReturnType<typeof buildResumeProfileStudioPersistPayload>,
  overrides: Partial<ResumeProfile> = {},
): ResumeProfile {
  return {
    id: "profile-1",
    userId: "user-1",
    isDefault: true,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    city: payload.city,
    country: payload.country,
    targetTitle: payload.targetTitle,
    summary: payload.summary,
    skills: payload.skills,
    resumeRawText: null,
    content: payload.content as Prisma.JsonValue,
    calibrationScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("normalizeLinkedInForStorage", () => {
  it("adds https scheme for bare linkedin.com URLs", () => {
    expect(normalizeLinkedInForStorage("linkedin.com/in/jane-doe")).toBe(
      "https://linkedin.com/in/jane-doe",
    );
  });

  it("preserves existing https URLs", () => {
    expect(normalizeLinkedInForStorage("https://www.linkedin.com/in/jane-doe/")).toBe(
      "https://www.linkedin.com/in/jane-doe/",
    );
  });

  it("returns empty string for blank input", () => {
    expect(normalizeLinkedInForStorage("   ")).toBe("");
  });
});

describe("buildResumeProfileStudioPersistPayload", () => {
  it("persists every header and section field including linkedIn and email", () => {
    const form = fullForm({
      email: "updated@example.com",
      linkedIn: "linkedin.com/in/updated-profile",
    });
    const skills = studioSkillsFromForm(form);

    const payload = buildResumeProfileStudioPersistPayload({
      form,
      targetTitle: "Director of Engineering",
      skills,
      fallbackEmail: "fallback@example.com",
    });

    expect(payload.firstName).toBe("Jane");
    expect(payload.lastName).toBe("Doe");
    expect(payload.email).toBe("updated@example.com");
    expect(payload.phone).toBe("+1 (555) 010-0200");
    expect(payload.city).toBe("Austin");
    expect(payload.country).toBe("TX");
    expect(payload.targetTitle).toBe("Director of Engineering");
    expect(payload.summary).toContain("Experienced engineering leader");
    expect(payload.skills).toEqual(skills);

    const content = payload.content as Record<string, unknown>;
    expect(content.email).toBe("updated@example.com");
    expect(content.linkedIn).toBe("https://linkedin.com/in/updated-profile");
    expect(content.pageLengthPreference).toBe("2");
    expect(Array.isArray(content.experiences)).toBe(true);
    expect(Array.isArray(content.education)).toBe(true);
    expect(content.certifications).toEqual(["AWS Solutions Architect"]);
    expect(content.projects).toEqual(["Internal developer portal"]);
    expect(content.languages).toEqual(["English — Native"]);
    expect(content.customSections).toEqual([
      { title: "Leadership", content: "Mentored 12 engineers" },
    ]);
  });

  it("uses fallback email only when form email is invalid", () => {
    const payload = buildResumeProfileStudioPersistPayload({
      form: fullForm({ email: "not-an-email" }),
      targetTitle: "Engineer",
      skills: ["TypeScript"],
      fallbackEmail: "fallback@example.com",
    });

    expect(payload.email).toBe("fallback@example.com");
  });

  it("round-trips all fields through profile hydration", () => {
    const form = fullForm({
      email: "roundtrip@example.com",
      linkedIn: "https://linkedin.com/in/roundtrip",
    });
    const skills = studioSkillsFromForm(form);
    const payload = buildResumeProfileStudioPersistPayload({
      form,
      targetTitle: "Staff Engineer",
      skills,
      fallbackEmail: "fallback@example.com",
    });

    const hydrated = hubRefineryFormFromProfile(mockProfileFromPersist(payload));

    expect(hydrated.firstName).toBe("Jane");
    expect(hydrated.lastName).toBe("Doe");
    expect(hydrated.email).toBe("roundtrip@example.com");
    expect(hydrated.phone).toBe("+1 (555) 010-0200");
    expect(hydrated.cityState).toBe("Austin, TX");
    expect(hydrated.linkedIn).toBe("https://linkedin.com/in/roundtrip");
    expect(hydrated.professionalSummary).toContain("Experienced engineering leader");
    expect(hydrated.pageLengthPreference).toBe("2");
    expect(hydrated.experience[0]?.title).toBe("Head of Engineering");
    expect(hydrated.experience[0]?.bullets).toContain("Led platform modernization");
    expect(hydrated.education[0]?.school).toBe("State University");
    expect(hydrated.certifications[0]?.text).toBe("AWS Solutions Architect");
    expect(hydrated.projects[0]?.text).toBe("Internal developer portal");
    expect(hydrated.languages[0]?.text).toBe("English — Native");
    expect(hydrated.customSections[0]?.title).toBe("Leadership");
    expect(studioSkillsFromForm(hydrated)).toEqual(skills);
  });

  it("hydrates email from content when profile column is empty", () => {
    const form = fullForm({ email: "content-only@example.com" });
    const skills = studioSkillsFromForm(form);
    const content = hubFormToProfileContent(form, skills) as Prisma.JsonValue;
    const profile = mockProfileFromPersist(
      buildResumeProfileStudioPersistPayload({
        form,
        targetTitle: "Engineer",
        skills,
        fallbackEmail: "fallback@example.com",
      }),
      { email: "", content },
    );

    const hydrated = hubRefineryFormFromProfile(profile);
    expect(hydrated.email).toBe("content-only@example.com");
  });
});
