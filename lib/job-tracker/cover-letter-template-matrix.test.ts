import { describe, expect, it } from "vitest";
import {
  COVER_LETTER_TEMPLATE_MATRIX,
  composeCoverLetterFromMatrix,
  countTemplateWords,
  DEFAULT_COVER_LETTER_COMPOSITION,
  DETERMINISTIC_COVER_LETTER_WORD_TARGET,
  renderCoverLetterBlock,
} from "@/lib/job-tracker/cover-letter-template-matrix";

const PLACEHOLDERS = {
  company: "Acme Corp",
  targetTitle: "Senior Software Engineer",
  topSkill: "TypeScript",
  secondSkill: "PostgreSQL",
  thirdSkill: "AWS",
  priorTitle: "Staff Engineer",
  priorCompany: "Horizon Labs",
  jdKeyword: "Kubernetes",
  jdKeyword2: "Platform",
  achievementLine: "Scaled core APIs to serve more than 10 million users.",
  summarySnippet:
    "Platform engineer with a decade of experience building reliable backend systems.",
};

const BANNED_CLICHES = [
  /fast-paced digital world/i,
  /incredibly thrilled/i,
  /testament to/i,
  /\btrajectory\b/i,
  /I am writing to apply/i,
  /hard worker/i,
  /team player/i,
  /think outside the box/i,
];

describe("COVER_LETTER_TEMPLATE_MATRIX", () => {
  it("exposes exactly three options per tier including whyCompany", () => {
    expect(COVER_LETTER_TEMPLATE_MATRIX.openings).toHaveLength(3);
    expect(COVER_LETTER_TEMPLATE_MATRIX.experienceBlocks).toHaveLength(3);
    expect(COVER_LETTER_TEMPLATE_MATRIX.whyCompany).toHaveLength(3);
    expect(COVER_LETTER_TEMPLATE_MATRIX.closings).toHaveLength(3);
  });

  it("avoids banned clichés and uses journey in grounded opening", () => {
    const allText = [
      ...COVER_LETTER_TEMPLATE_MATRIX.openings,
      ...COVER_LETTER_TEMPLATE_MATRIX.experienceBlocks,
      ...COVER_LETTER_TEMPLATE_MATRIX.whyCompany,
      ...COVER_LETTER_TEMPLATE_MATRIX.closings,
    ]
      .map((block) => block.text)
      .join("\n");

    for (const pattern of BANNED_CLICHES) {
      expect(allText).not.toMatch(pattern);
    }

    expect(COVER_LETTER_TEMPLATE_MATRIX.openings[2].text).toMatch(/journey/i);
  });

  it("renders placeholders and composes a four-part letter near word target", () => {
    const opening = renderCoverLetterBlock(
      COVER_LETTER_TEMPLATE_MATRIX.openings[0].text,
      PLACEHOLDERS,
    );
    expect(opening).toContain("Acme Corp");
    expect(opening).not.toContain("${");

    const letter = composeCoverLetterFromMatrix(DEFAULT_COVER_LETTER_COMPOSITION, PLACEHOLDERS);
    expect(letter).toBeTruthy();
    expect(letter).toContain("TypeScript");
    expect(letter).toContain("Horizon Labs");
    expect(letter).toContain("Kubernetes");
    expect(letter!.split("\n\n").length).toBeGreaterThanOrEqual(4);

    const words = countTemplateWords(letter!);
    expect(words).toBeGreaterThanOrEqual(DETERMINISTIC_COVER_LETTER_WORD_TARGET.min);
    expect(words).toBeLessThanOrEqual(DETERMINISTIC_COVER_LETTER_WORD_TARGET.max);
  });
});
