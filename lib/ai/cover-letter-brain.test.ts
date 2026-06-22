import { describe, expect, it } from "vitest";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
  countCoverLetterWords,
  normalizeCoverLetterBody,
} from "@/src/lib/ai/engine/cover-letter-brain";
import { COVER_LETTER_GENERATION_RULES } from "@/src/lib/ai/engine/cover-letter-rules";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

describe("cover-letter-brain", () => {
  it("embeds full generation rules in the system prompt", () => {
    const system = buildCoverLetterSystemPrompt();
    expect(system).toBe(COVER_LETTER_GENERATION_RULES);
    expect(system).toMatch(/300–350 words/i);
    expect(system).toMatch(/Why this company/i);
    expect(system).toMatch(/I am writing to apply/i);
    expect(system).toMatch(/Return only the final cover letter/i);
  });

  it("builds user prompt with JD, experience bullets, and refine mode", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      professionalSummary: "Algorithm designer.",
      skillsText: "TypeScript, Postgres",
      experience: [
        {
          id: "1",
          title: "Staff Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "- Scaled APIs to 10M users\n- Led team of 12",
          hidden: false,
        },
      ],
    };

    const prompt = buildCoverLetterUserPrompt({
      form,
      targetTitle: "Senior Engineer",
      company: "Globex",
      jobTitle: "Software Engineer",
      jobDescription: "We need distributed systems and PostgreSQL experience.",
      existing: "Dear team,\n\nOld draft.",
    });

    expect(prompt).toContain("Globex");
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Algorithm designer");
    expect(prompt).toContain("Staff Engineer at Acme");
    expect(prompt).toContain("Scaled APIs to 10M users");
    expect(prompt).toContain("Refine the existing draft");
    expect(prompt).toContain("distributed systems");
  });

  it("strips markdown fences and leading meta commentary", () => {
    expect(normalizeCoverLetterBody("```\nDear team,\n\nHello.\n```")).toBe(
      "Dear team,\n\nHello.",
    );
    expect(
      normalizeCoverLetterBody("Here's the final cover letter:\n\nDear team,\n\nHello."),
    ).toBe("Dear team,\n\nHello.");
  });

  it("counts words for length guardrails", () => {
    expect(countCoverLetterWords("one two three")).toBe(3);
    expect(countCoverLetterWords("  spaced   words  ")).toBe(2);
  });
});
