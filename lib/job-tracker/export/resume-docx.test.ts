import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildResumeDocx, validateResumeForm } from "@/lib/job-tracker/export/resume-docx";

function sampleForm() {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    cityState: "London",
    phone: "+44 20 7946 0958",
    professionalSummary: "Algorithm pioneer with systems experience.",
    skillsText: "Mathematics, TypeScript, Analytics",
    experience: [
      {
        id: "1",
        title: "Analyst",
        company: "Analytical Engines",
        location: "London",
        startMonth: "Jan",
        startYear: "1840",
        endMonth: "Dec",
        endYear: "1852",
        bullets: "- Designed computation methods\n- Documented algorithms",
        hidden: false,
      },
    ],
    education: [
      {
        id: "edu-1",
        school: "Self-taught",
        degree: "Mathematics",
        location: "",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        hidden: false,
      },
    ],
  };
}

describe("buildResumeDocx", () => {
  it("returns a non-empty docx byte array", async () => {
    const bytes = await buildResumeDocx(sampleForm(), "Senior Analyst");
    expect(bytes.byteLength).toBeGreaterThan(1000);
    // ZIP / OOXML signature
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("validateResumeForm passes for compliant form", () => {
    const result = validateResumeForm(sampleForm());
    expect(result.valid).toBe(true);
  });

  it("validateResumeForm fails when a role exceeds six bullets", () => {
    const form = sampleForm();
    form.pageLengthPreference = "auto";
    form.experience[0]!.bullets = Array.from({ length: 7 }, (_, i) => `Bullet ${i + 1}`).join("\n");
    const result = validateResumeForm(form);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.violations[0]).toMatch(/7 bullets/);
    }
  });
});
