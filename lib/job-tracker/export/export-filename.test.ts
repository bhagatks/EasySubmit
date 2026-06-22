import { describe, expect, it } from "vitest";
import { reviewExportFilename } from "@/lib/job-tracker/export/export-filename";

describe("reviewExportFilename", () => {
  it("slugifies company and role with correct extension", () => {
    expect(
      reviewExportFilename({
        company: "Walmart Inc.",
        jobTitle: "Software Engineer II",
        kind: "resume",
        format: "pdf",
      }),
    ).toBe("Walmart_Inc_Software_Engineer_II_resume.pdf");
  });

  it("uses fallbacks for missing names", () => {
    expect(
      reviewExportFilename({
        company: null,
        jobTitle: "",
        kind: "cover",
        format: "word",
      }),
    ).toBe("Company_Role_cover_letter.doc");
  });

  it("strips unsafe characters", () => {
    expect(
      reviewExportFilename({
        company: "A/B & Co!!!",
        jobTitle: "Role@Home",
        kind: "resume",
        format: "pdf",
      }),
    ).toMatch(/^AB_Co_RoleHome_resume\.pdf$/);
  });
});
