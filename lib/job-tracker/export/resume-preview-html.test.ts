import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildResumePreviewHtml } from "@/lib/job-tracker/export/resume-preview-html";

describe("buildResumePreviewHtml", () => {
  it("renders name, contact, role, and summary from merged form", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      cityState: "London",
      professionalSummary: "Algorithm pioneer.",
    };

    const html = buildResumePreviewHtml(form, "Senior Engineer");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Algorithm pioneer.");
  });

  it("escapes HTML in user fields", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "<script>",
      professionalSummary: "Safe & sound",
    };

    const html = buildResumePreviewHtml(form, "Role");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Safe &amp; sound");
  });

  it("renders experience and education sections", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      experience: [
        {
          id: "exp-1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "Jan",
          startYear: "2020",
          endMonth: "Dec",
          endYear: "2024",
          bullets: "Built systems\n- Improved uptime",
          hidden: false,
        },
      ],
      education: [
        {
          id: "edu-1",
          school: "MIT",
          degree: "B.S. CS",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "2019",
          hidden: false,
        },
      ],
    };

    const html = buildResumePreviewHtml(form, "Senior Engineer");
    expect(html).toContain("Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("Built systems");
    expect(html).toContain("MIT");
    expect(html).toContain("B.S. CS");
  });
});
