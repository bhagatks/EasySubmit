import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildResumeContentFromForm,
  MAX_BULLETS_PER_ROLE,
  normalizeRoleBullets,
  resolveResumeEntryTitleLine,
  validateResumeForm,
} from "@/lib/job-tracker/export/resume-content-model";
import { DOCX_SPACING, PDF_SPACING, SECTION_TITLE } from "@/lib/job-tracker/export/resume-style";

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
      pageLengthPreference: "auto" as const,
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

  it("does not cap bullets when rules v2 page mode 2 is active", () => {
    const bullets = Array.from({ length: 8 }, (_, i) => `Bullet ${i + 1}`);
    const form = {
      ...emptyHubRefineryForm(),
      pageLengthPreference: "2" as const,
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
    expect(content.experience[0]?.bullets).toHaveLength(8);
    expect(content.warnings).toHaveLength(0);
  });

  it("does not cap bullets when rules v2 page mode 1 is active", () => {
    const bullets = Array.from({ length: 8 }, (_, i) => `Bullet ${i + 1}`);
    const form = {
      ...emptyHubRefineryForm(),
      pageLengthPreference: "1" as const,
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
    expect(content.experience[0]?.bullets).toHaveLength(8);
    expect(content.warnings).toHaveLength(0);
  });

  it("uses shared section titles from resume-style", () => {
    const content = buildResumeContentFromForm(emptyHubRefineryForm(), "Role");
    expect(SECTION_TITLE.summary).toBe("Professional Summary");
    expect(content.experience).toEqual([]);
  });

  it("splits mashed company/date in experience title when date fields are empty", () => {
    const form = {
      ...emptyHubRefineryForm(),
      experience: [
        {
          id: "1",
          title: "CVS HealthSep 2014 – Dec 2023",
          company: "Director | Engineering Manager",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "- Led digital apps",
          hidden: false,
        },
      ],
    };

    const content = buildResumeContentFromForm(form, "Role");
    expect(content.experience[0]).toMatchObject({
      title: "CVS Health",
      subtitle: "Director | Engineering Manager",
      dateRange: "Sep 2014 – Dec 2023",
    });
  });

  it("keeps structured dates when month-year fields are populated", () => {
    expect(
      resolveResumeEntryTitleLine("7-Eleven", "Jan 2024 – Present"),
    ).toEqual({
      title: "7-Eleven",
      dateRange: "Jan 2024 – Present",
    });
  });

  it("uses the same section rhythm for Word and PDF exports", () => {
    expect(DOCX_SPACING).toEqual(PDF_SPACING);
  });
});
