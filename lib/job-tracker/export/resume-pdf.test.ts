import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildResumePdf } from "@/lib/job-tracker/export/resume-pdf";

function sampleForm() {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    cityState: "London",
    professionalSummary: "Algorithm pioneer.",
    skillsText: "Mathematics, TypeScript",
    experience: [
      {
        id: "1",
        title: "Analyst",
        company: "Analytical Engines",
        location: "",
        startMonth: "Jan",
        startYear: "1840",
        endMonth: "",
        endYear: "",
        bullets: "- Designed computation methods",
        hidden: false,
      },
    ],
  };
}

describe("buildResumePdf", () => {
  it("returns a PDF with valid header bytes", async () => {
    const bytes = await buildResumePdf(sampleForm(), "Senior Analyst");
    expect(bytes.byteLength).toBeGreaterThan(500);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
