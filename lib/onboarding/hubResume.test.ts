import { describe, expect, it } from "vitest";
import {
  coordinatesToPrimeResume,
  coordinatesToRefineryForm,
  emptyCoordinatesValues,
  emptyHubRefineryForm,
  formFullName,
  hubFormToCoordinates,
  mergeParsedWithCoordinates,
  profileToResumePatch,
  refineryFormToPrimeResume,
  structuredToPrimeResume,
} from "@/lib/onboarding/hubResume";
import type { StructuredResume } from "@/lib/resume/heuristicParser";

const PARSED: StructuredResume = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  location: "San Francisco, CA",
  linkedIn: "linkedin.com/in/jane",
  summary: "Engineer summary",
  experience: [
    {
      role: "Engineer",
      company: "Acme",
      date: "Jan 2020 – Present",
      description: ["Built APIs"],
    },
  ],
  education: [{ school: "UC Berkeley", degree: "B.S.", date: "2016" }],
  skills: ["TypeScript", "React"],
  certifications: ["AWS SA"],
  projects: ["Side project"],
  languages: ["English"],
};

describe("hubResume", () => {
  it("emptyHubRefineryForm returns defaults", () => {
    const form = emptyHubRefineryForm();
    expect(form.firstName).toBe("");
    expect(form.pageLengthPreference).toBeTruthy();
  });

  it("hubFormToCoordinates splits phone", () => {
    const form = emptyHubRefineryForm();
    form.firstName = "Jane";
    form.lastName = "Doe";
    form.phone = "+1 4155550100";
    const coords = hubFormToCoordinates(form);
    expect(coords.firstName).toBe("Jane");
    expect(coords.phone).toBeTruthy();
  });

  it("mergeParsedWithCoordinates prefers parsed fields", () => {
    const form = mergeParsedWithCoordinates(PARSED, emptyCoordinatesValues());
    expect(form.firstName).toBe("Jane");
    expect(form.skillsText).toContain("TypeScript");
    expect(form.experience).toHaveLength(1);
  });

  it("refineryFormToPrimeResume maps visible sections", () => {
    const form = mergeParsedWithCoordinates(PARSED, emptyCoordinatesValues());
    const prime = refineryFormToPrimeResume(form);
    expect(prime.fullName).toBe("Jane Doe");
    expect(prime.skills).toContain("TypeScript");
    expect(prime.experience[0].bullets.length).toBeGreaterThan(0);
  });

  it("structuredToPrimeResume is end-to-end from parsed resume", () => {
    const prime = structuredToPrimeResume(PARSED);
    expect(prime.email).toBe("jane@example.com");
  });

  it("coordinatesToRefineryForm and coordinatesToPrimeResume", () => {
    const coords = {
      ...emptyCoordinatesValues(),
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    };
    const form = coordinatesToRefineryForm(coords);
    expect(form.email).toBe("jane@example.com");
    const prime = coordinatesToPrimeResume(coords, { targetRole: "Staff Engineer" });
    expect(prime.headline).toBe("Staff Engineer");
  });

  it("profileToResumePatch merges profile", () => {
    const base = refineryFormToPrimeResume(emptyHubRefineryForm());
    const patched = profileToResumePatch({ targetRole: "PM" }, base);
    expect(patched.profile?.targetRole).toBe("PM");
  });

  it("formFullName joins names", () => {
    const form = emptyHubRefineryForm();
    form.firstName = "Jane";
    form.lastName = "Doe";
    expect(formFullName(form)).toBe("Jane Doe");
  });
});
