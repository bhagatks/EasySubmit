import { describe, expect, it } from "vitest";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
  normalizeCoverLetterBody,
} from "@/src/lib/ai/engine/cover-letter-brain";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

describe("cover-letter-brain", () => {
  it("builds prompts with job and candidate context", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      professionalSummary: "Algorithm designer.",
      skillsText: "TypeScript, Postgres",
    };

    const system = buildCoverLetterSystemPrompt();
    const prompt = buildCoverLetterUserPrompt({
      form,
      targetTitle: "Senior Engineer",
      company: "Acme",
      jobTitle: "Software Engineer",
      jobDescription: "We need distributed systems experience.",
      existing: "Dear team,\n\nOld draft.",
    });

    expect(system).toMatch(/plain text only/i);
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Algorithm designer");
    expect(prompt).toContain("Refine this existing draft");
  });

  it("strips markdown fences from model output", () => {
    expect(normalizeCoverLetterBody("```\nDear team,\n\nHello.\n```")).toBe("Dear team,\n\nHello.");
  });
});
