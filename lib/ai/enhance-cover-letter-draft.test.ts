import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterDraft } from "@/lib/ai/enhance-cover-letter-draft";

describe("buildCoverLetterDraft", () => {
  it("uses company in greeting when available", () => {
    const form = { ...emptyHubRefineryForm(), firstName: "Ada", lastName: "Lovelace" };
    const draft = buildCoverLetterDraft({
      form,
      targetTitle: "Senior Engineer",
      company: "Acme",
      jobTitle: "Software Engineer",
    });

    expect(draft).toContain("Dear Acme hiring team,");
    expect(draft).toContain("Software Engineer");
    expect(draft).toContain("Sincerely,\nAda Lovelace");
  });

  it("falls back to generic greeting without company", () => {
    const draft = buildCoverLetterDraft({
      form: emptyHubRefineryForm(),
      targetTitle: "Analyst",
      company: null,
      jobTitle: "Data Analyst",
    });

    expect(draft).toContain("Dear hiring manager,");
    expect(draft).toContain("Data Analyst");
  });

  it("mentions posting snippet when job description exists", () => {
    const draft = buildCoverLetterDraft({
      form: emptyHubRefineryForm(),
      targetTitle: "Engineer",
      company: "Acme",
      jobTitle: "Engineer",
      jobDescription: "We need distributed systems experience with Kubernetes and Go.",
    });

    expect(draft).toMatch(/excited to apply/i);
    expect(draft).toMatch(/posting/i);
  });
});
