import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildResumePlainText,
  resumeHasExportableContent,
} from "@/lib/job-tracker/export/resume-plain-text";

describe("buildResumePlainText", () => {
  it("includes name, target title, summary, and bullets", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      professionalSummary: "Math and computing pioneer.",
      experience: [
        {
          id: "1",
          hidden: false,
          title: "Analyst",
          company: "Analytical Engines",
          location: "London",
          startMonth: "Jan",
          startYear: "1840",
          endMonth: "",
          endYear: "",
          bullets: "- Designed algorithms",
        },
      ],
    };

    const text = buildResumePlainText(form, "Senior Engineer");
    expect(text).toContain("ADA LOVELACE");
    expect(text).toContain("Senior Engineer");
    expect(text).toContain("PROFESSIONAL SUMMARY");
    expect(text).toContain("Designed algorithms");
  });

  it("skips hidden experience entries", () => {
    const form = {
      ...emptyHubRefineryForm(),
      experience: [
        {
          id: "1",
          hidden: true,
          title: "Hidden",
          company: "Secret",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "- Should not appear",
        },
      ],
    };

    const text = buildResumePlainText(form, "Role");
    expect(text).not.toContain("Hidden");
    expect(text).not.toContain("Should not appear");
  });
});

describe("resumeHasExportableContent", () => {
  it("detects content from target title, summary, skills, or experience", () => {
    const empty = emptyHubRefineryForm();
    expect(resumeHasExportableContent(empty, "")).toBe(false);
    expect(resumeHasExportableContent(empty, "Engineer")).toBe(true);
    expect(
      resumeHasExportableContent(
        { ...empty, professionalSummary: "Ready" },
        "",
      ),
    ).toBe(true);
    expect(
      resumeHasExportableContent(
        {
          ...empty,
          experience: [
            {
              id: "1",
              hidden: false,
              title: "Dev",
              company: "",
              location: "",
              startMonth: "",
              startYear: "",
              endMonth: "",
              endYear: "",
              bullets: "",
            },
          ],
        },
        "",
      ),
    ).toBe(true);
  });
});
