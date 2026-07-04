/**
 * Contract tests for resume profile studio persist ↔ hydrate.
 *
 * Why the LinkedIn/email bug shipped:
 * - saveResumeProfileStudio (server action) is intentionally not unit-tested (Prisma/session).
 * - studio-form-db.test.ts only asserted linkedIn on *read* from mock JSON, not write round-trip.
 * - No test exercised buildResumeProfileStudioPersistPayload until the fix landed.
 * - UI: RefineryPanel must not override register() name attrs (e.g. name="es-email"
 *   after {...register("email")} breaks react-hook-form submit for email/linkedIn).
 *
 * These tests are the guardrail: every HubRefineryForm field must survive save → DB shape → hydrate.
 */
import type { Prisma } from "@/lib/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { ResumeProfile } from "@/lib/profile/resume-profile-core";
import {
  hubRefineryFormFromProfile,
  studioSkillsFromForm,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { buildResumeProfileStudioPersistPayload } from "@/lib/profile/studio-profile-persist";

function completeForm(overrides: Partial<HubRefineryForm> = {}): HubRefineryForm {
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

function profileRowFromPayload(
  payload: ReturnType<typeof buildResumeProfileStudioPersistPayload>,
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
  };
}

function roundTrip(form: HubRefineryForm, targetTitle: string) {
  const skills = studioSkillsFromForm(form);
  const payload = buildResumeProfileStudioPersistPayload({
    form,
    targetTitle,
    skills,
    fallbackEmail: "fallback@example.com",
  });
  const profile = profileRowFromPayload(payload);
  return {
    payload,
    profile,
    hydrated: hubRefineryFormFromProfile(profile),
    targetTitle: targetTitleFromProfile(profile),
    skills,
  };
}

describe("profile studio field contract", () => {
  it("round-trips every editable field through persist payload and hydration", () => {
    const input = completeForm({
      email: "updated@example.com",
      linkedIn: "linkedin.com/in/updated-handle",
      phone: "+1 (555) 999-0000",
    });
    const { payload, hydrated, targetTitle, skills } = roundTrip(input, "Director of Engineering");

    // Profile row columns
    expect(payload.firstName).toBe("Jane");
    expect(payload.lastName).toBe("Doe");
    expect(payload.email).toBe("updated@example.com");
    expect(payload.phone).toBe("+1 (555) 999-0000");
    expect(payload.city).toBe("Austin");
    expect(payload.country).toBe("TX");
    expect(payload.targetTitle).toBe("Director of Engineering");
    expect(targetTitle).toBe("Director of Engineering");
    expect(payload.summary).toContain("Experienced engineering leader");
    expect(payload.skills).toEqual(skills);

    const content = payload.content as Record<string, unknown>;
    expect(content.email).toBe("updated@example.com");
    expect(content.phone).toBe("+1 (555) 999-0000");
    expect(content.linkedIn).toBe("https://linkedin.com/in/updated-handle");

    // Hydrated form
    expect(hydrated.firstName).toBe("Jane");
    expect(hydrated.lastName).toBe("Doe");
    expect(hydrated.email).toBe("updated@example.com");
    expect(hydrated.phone).toBe("+1 (555) 999-0000");
    expect(hydrated.cityState).toBe("Austin, TX");
    expect(hydrated.linkedIn).toBe("https://linkedin.com/in/updated-handle");
    expect(hydrated.professionalSummary).toContain("Experienced engineering leader");
    expect(hydrated.pageLengthPreference).toBe("2");
    expect(studioSkillsFromForm(hydrated)).toEqual(skills);

    expect(hydrated.experience[0]).toMatchObject({
      title: "Head of Engineering",
      company: "Acme Corp",
      location: "Austin, TX",
      startMonth: "Jan",
      startYear: "2020",
      endYear: "Present",
    });
    expect(hydrated.experience[0]?.bullets).toContain("Led platform modernization");

    expect(hydrated.education[0]).toMatchObject({
      degree: "BS Computer Science",
      school: "State University",
      location: "Austin, TX",
      startYear: "2004",
      endYear: "2008",
    });

    expect(hydrated.certifications[0]?.text).toBe("AWS Solutions Architect");
    expect(hydrated.projects[0]?.text).toBe("Internal developer portal");
    expect(hydrated.languages[0]?.text).toBe("English — Native");
    expect(hydrated.customSections[0]).toMatchObject({
      title: "Leadership",
      content: "Mentored 12 engineers",
    });
  });

  it("regression: header-only linkedIn + email edits must persist (the reported bug)", () => {
    const baseline = completeForm({
      email: "old@example.com",
      linkedIn: "",
    });
    const { hydrated: before } = roundTrip(baseline, "Engineering Leader");
    expect(before.email).toBe("old@example.com");
    expect(before.linkedIn).toBe("");

    const edited = {
      ...before,
      email: "new@example.com",
      linkedIn: "linkedin.com/in/new-handle",
    };
    const { payload, hydrated: after } = roundTrip(edited, "Engineering Leader");

    expect(payload.email).toBe("new@example.com");
    expect((payload.content as Record<string, unknown>).linkedIn).toBe(
      "https://linkedin.com/in/new-handle",
    );
    expect(after.email).toBe("new@example.com");
    expect(after.linkedIn).toBe("https://linkedin.com/in/new-handle");
  });

  it("hydrates contact fields from content JSON when profile columns are empty", () => {
    const form = completeForm({
      email: "content-only@example.com",
      phone: "+1 (555) 111-2222",
      linkedIn: "linkedin.com/in/content-only",
    });
    const skills = studioSkillsFromForm(form);
    const payload = buildResumeProfileStudioPersistPayload({
      form,
      targetTitle: "Engineer",
      skills,
      fallbackEmail: "fallback@example.com",
    });

    const profile = profileRowFromPayload(payload);
    const legacyProfile: ResumeProfile = {
      ...profile,
      email: "",
      phone: null,
      content: payload.content as Prisma.JsonValue,
    };

    const hydrated = hubRefineryFormFromProfile(legacyProfile);
    expect(hydrated.email).toBe("content-only@example.com");
    expect(hydrated.phone).toBe("+1 (555) 111-2222");
    expect(hydrated.linkedIn).toBe("https://linkedin.com/in/content-only");
  });

  it("documents untested layers that allowed the bug to reach production", () => {
    // Server action saveResumeProfileStudio — excluded per docs/rules/testing.md
    // React ResumeStudioEditor + RefineryPanel — excluded (client components)
    // This file covers the lib/ contract those layers depend on.
    expect(true).toBe(true);
  });
});
