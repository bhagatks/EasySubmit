import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildTailoredResumePreview } from "@/lib/job-tracker/build-tailored-resume-preview";

describe("buildTailoredResumePreview", () => {
  it("builds PrimeResume preview with target role", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      professionalSummary: "Tailored summary",
      skillsText: "TypeScript, Leadership",
    };

    const result = buildTailoredResumePreview(
      form,
      "Director of Engineering",
      ["professionalSummary", "skills"],
      "2026-06-22T12:00:00.000Z",
    );

    expect(result.targetTitle).toBe("Director of Engineering");
    expect(result.changedSections).toEqual(["professionalSummary", "skills"]);
    expect(result.preview.profile?.targetRole).toBe("Director of Engineering");
    expect(result.preview.fullName).toBe("Ada Lovelace");
    expect(result.preview.summary).toBe("Tailored summary");
    expect(result.preview.skills).toContain("TypeScript");
    expect(result.previewHtml).toContain("Tailored summary");
    expect(result.skillsText).toBe("TypeScript, Leadership");
  });

  it("persists page length and rules version metadata", () => {
    const form = {
      ...emptyHubRefineryForm(),
      pageLengthPreference: "4+" as const,
      skillsText: "Data: SQL, Python",
    };

    const result = buildTailoredResumePreview(form, "Director", ["skills"], "2026-07-05T00:00:00.000Z", {
      resumeRulesVersion: 2,
    });

    expect(result.pageLengthPreference).toBe("4+");
    expect(result.resumeRulesVersion).toBe(2);
    expect(result.skillsText).toBe("Data: SQL, Python");
  });
});
