import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import { getTextWithHighestFeatureScore } from "@/lib/resume/openResume/extract-resume-from-sections/lib/feature-scoring-system";
import { hasLetter } from "@/lib/resume/openResume/extract-resume-from-sections/lib/common-features";

function item(text: string): TextItem {
  return { text, x: 0, y: 0, width: 100, height: 12, fontName: "Arial", hasEOL: true };
}

describe("getTextWithHighestFeatureScore", () => {
  it("returns highest scoring text item", () => {
    const [text] = getTextWithHighestFeatureScore(
      [item("hello"), item("Jane Doe")],
      [[hasLetter, 1]],
    );
    expect(text).toBeTruthy();
  });

  it("returns empty string when highest score is not positive", () => {
    const [text] = getTextWithHighestFeatureScore(
      [item("x")],
      [[hasLetter, -5]],
      true,
    );
    expect(text).toBe("");
  });

  it("concatenates tied highest scores when requested", () => {
    const [text] = getTextWithHighestFeatureScore(
      [item("Jane"), item("Doe")],
      [[hasLetter, 2]],
      false,
      true,
    );
    expect(text).toContain("Jane");
    expect(text).toContain("Doe");
  });
});
