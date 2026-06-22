import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildResumeContentFromForm,
  MAX_BULLETS_PER_ROLE,
  normalizeRoleBullets,
  validateResumeForm,
} from "@/lib/job-tracker/export/resume-content-model";
import { SECTION_TITLE } from "@/lib/job-tracker/export/resume-style";

describe("resume-content-model", () => {
  it("builds ordered sections from hub form", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      cityState: "London",
      professionalSummary: "Algorithm pioneer.",
      skillsText: "TypeScript, Math",
      experience: [
        {
          id: "1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "Jan",
          startYear: "2020",
          endMonth: "Dec",
          endYear: "2024",
          bullets: "- Built systems\n- Improved uptime",
          hidden: false,
        },
      ],
    };

    const content = buildResumeContentFromForm(form, "Senior Engineer");
    expect(content.name).toBe("Ada Lovelace");
    expect(content.summary).toBe("Algorithm pioneer.");
    expect(content.experience[0]?.bullets).toEqual(["Built systems", "Improved uptime"]);
    expect(content.targetTitle).toBe("Senior Engineer");
  });

  it("caps bullets at MAX_BULLETS_PER_ROLE and records warnings", () => {
    const bullets = Array.from({ length: 8 }, (_, i) => `Bullet ${i + 1}`);
    const { bullets: capped, truncated, originalCount } = normalizeRoleBullets(bullets);
    expect(capped).toHaveLength(MAX_BULLETS_PER_ROLE);
    expect(truncated).toBe(true);
    expect(originalCount).toBe(8);

    const form = {
      ...emptyHubRefineryForm(),
      experience: [
        {
          id: "1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: bullets.join("\n"),
          hidden: false,
        },
      ],
    };

    const content = buildResumeContentFromForm(form, "Role");
    expect(content.warnings.some((w) => w.includes("8 bullets"))).toBe(true);
    expect(validateResumeForm(form).valid).toBe(false);
  });

  it("uses shared section titles from resume-style", () => {
    const content = buildResumeContentFromForm(emptyHubRefineryForm(), "Role");
    expect(SECTION_TITLE.summary).toBe("Professional Summary");
    expect(content.experience).toEqual([]);
  });
});
