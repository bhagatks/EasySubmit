import { describe, expect, it } from "vitest";
import {
  COVER_LETTER_TEMPLATE_MATRIX,
  composeCoverLetterFromMatrix,
  DEFAULT_COVER_LETTER_COMPOSITION,
  renderCoverLetterBlock,
} from "@/lib/job-tracker/cover-letter-template-matrix";

const PLACEHOLDERS = {
  company: "Acme Corp",
  targetTitle: "Senior Software Engineer",
  topSkill: "TypeScript",
  priorTitle: "Staff Engineer",
};

const BANNED_CLICHES = [
  /fast-paced digital world/i,
  /incredibly thrilled/i,
  /testament to/i,
  /\btrajectory\b/i,
];

describe("COVER_LETTER_TEMPLATE_MATRIX", () => {
  it("exposes exactly three options per tier", () => {
    expect(COVER_LETTER_TEMPLATE_MATRIX.openings).toHaveLength(3);
    expect(COVER_LETTER_TEMPLATE_MATRIX.bodyAlignments).toHaveLength(3);
    expect(COVER_LETTER_TEMPLATE_MATRIX.closings).toHaveLength(3);
  });

  it("avoids banned clichés and uses journey in grounded opening", () => {
    const allText = [
      ...COVER_LETTER_TEMPLATE_MATRIX.openings,
      ...COVER_LETTER_TEMPLATE_MATRIX.bodyAlignments,
      ...COVER_LETTER_TEMPLATE_MATRIX.closings,
    ]
      .map((block) => block.text)
      .join("\n");

    for (const pattern of BANNED_CLICHES) {
      expect(allText).not.toMatch(pattern);
    }

    expect(COVER_LETTER_TEMPLATE_MATRIX.openings[2].text).toMatch(/journey/i);
  });

  it("renders placeholders and composes a full letter", () => {
    const opening = renderCoverLetterBlock(
      COVER_LETTER_TEMPLATE_MATRIX.openings[0].text,
      PLACEHOLDERS,
    );
    expect(opening).toContain("Acme Corp");
    expect(opening).not.toContain("${");

    const letter = composeCoverLetterFromMatrix(DEFAULT_COVER_LETTER_COMPOSITION, PLACEHOLDERS);
    expect(letter).toBeTruthy();
    expect(letter).toContain("TypeScript");
    expect(letter).toContain("Staff Engineer");
    expect(letter!.split("\n\n").length).toBeGreaterThanOrEqual(3);
  });
});
