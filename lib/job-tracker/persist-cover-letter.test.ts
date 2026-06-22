import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";

describe("buildCoverLetterDocumentPatch", () => {
  it("persists trimmed body and latex source", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    };

    const patch = buildCoverLetterDocumentPatch({
      form,
      company: "Acme",
      jobTitle: "Engineer",
      body: "  Dear hiring team,\n\nI am excited to apply.\n\nSincerely,\nAda Lovelace  ",
    });

    expect(patch.coverLetter).toContain("Dear hiring team");
    expect(patch.coverLetterLatex).toContain("\\begin{document}");
    expect(patch.coverLetterLatex).toContain("Ada Lovelace");
  });
});
