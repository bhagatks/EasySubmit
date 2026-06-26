import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  extractJobResumeOverrides,
  mergeProfileWithOverrides,
} from "@/lib/profile/job-resume-overrides";

function baseForm() {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    professionalSummary: "Base summary",
    skillsText: "TypeScript, React",
    experience: [
      {
        id: "exp-1",
        title: "Engineer",
        company: "Acme",
        location: "",
        startMonth: "01",
        startYear: "2020",
        endMonth: "",
        endYear: "",
        bullets: "Built things",
      },
    ],
  };
}

describe("job-resume-overrides", () => {
  it("extracts only changed sections", () => {
    const before = baseForm();
    const after = {
      ...before,
      professionalSummary: "Tailored summary for role",
      skillsText: "TypeScript, React, Leadership",
    };

    const { overrides, changedSections } = extractJobResumeOverrides(
      before,
      after,
      "Engineering Manager",
      "Director of Engineering",
    );

    expect(changedSections).toContain("professionalSummary");
    expect(changedSections).toContain("skills");
    expect(changedSections).toContain("profileRole");
    expect(overrides.targetTitle).toBe("Director of Engineering");
    expect(overrides.professionalSummary).toBe("Tailored summary for role");
    expect(overrides.experience).toBeUndefined();
  });

  it("extracts header overrides including linkedIn", () => {
    const before = baseForm();
    const after = {
      ...before,
      linkedIn: "https://linkedin.com/in/ada",
    };

    const { overrides, changedSections } = extractJobResumeOverrides(
      before,
      after,
      "Engineering Manager",
      "Engineering Manager",
    );

    expect(changedSections).toContain("header");
    expect(overrides.header?.linkedIn).toBe("https://linkedin.com/in/ada");
  });

  it("merges overrides onto base profile", () => {
    const before = baseForm();
    const { overrides } = extractJobResumeOverrides(
      before,
      { ...before, professionalSummary: "Job-specific summary" },
      "Engineering Manager",
      "Engineering Manager",
    );

    const merged = mergeProfileWithOverrides(before, "Engineering Manager", overrides);

    expect(merged.form.professionalSummary).toBe("Job-specific summary");
    expect(merged.form.firstName).toBe("Ada");
    expect(merged.form.experience[0]?.company).toBe("Acme");
  });
});
