import { describe, expect, it } from "vitest";
import {
  EXPORT_FILENAME_LIMITS,
  reviewExportFilename,
} from "@/lib/job-tracker/export/export-filename";

describe("reviewExportFilename", () => {
  it("builds FirstName_resume_Company_Role for resume pdf", () => {
    expect(
      reviewExportFilename({
        firstName: "Bhagath",
        company: "Walmart Inc.",
        jobTitle: "Software Engineer II",
        kind: "resume",
        format: "pdf",
      }),
    ).toBe("Bhagath_resume_Walmart_Inc_Software_Engineer_II.pdf");
  });

  it("builds FirstName_resume_Company_Role for resume word", () => {
    expect(
      reviewExportFilename({
        firstName: "Ada",
        company: "Acme Corp",
        jobTitle: "Engineer",
        kind: "resume",
        format: "word",
      }),
    ).toBe("Ada_resume_Acme_Corp_Engineer.docx");
  });

  it("uses fallbacks for missing names", () => {
    expect(
      reviewExportFilename({
        company: null,
        jobTitle: "",
        kind: "cover",
        format: "word",
      }),
    ).toBe("Applicant_cover_letter_Company_Role.docx");
  });

  it("strips unsafe characters", () => {
    expect(
      reviewExportFilename({
        firstName: "A/B",
        company: "A/B & Co!!!",
        jobTitle: "Role@Home",
        kind: "resume",
        format: "pdf",
      }),
    ).toBe("AB_resume_AB_Co_RoleHome.pdf");
  });

  it("truncates long segments and keeps total basename within limit", () => {
    const filename = reviewExportFilename({
      firstName: "Christopher-Alexander",
      company: "Very Long International Corporation Name Holdings",
      jobTitle:
        "Senior Staff Principal Distinguished Software Engineering Architect Lead",
      kind: "resume",
      format: "pdf",
    });

    const basename = filename.replace(/\.pdf$/, "");
    expect(basename.length).toBeLessThanOrEqual(EXPORT_FILENAME_LIMITS.totalBasename);
    expect(filename.startsWith("Christopher-Alexander_resume_")).toBe(true);
  });
});
