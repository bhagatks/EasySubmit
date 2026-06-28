import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import { divideSectionIntoSubsections } from "@/lib/resume/openResume/extract-resume-from-sections/lib/subsections";

function item(text: string, y: number, fontName = "Arial"): TextItem {
  return { text, x: 0, y, width: 100, height: 12, fontName, hasEOL: true };
}

describe("divideSectionIntoSubsections", () => {
  it("splits subsections by large vertical gaps", () => {
    const lines = [
      [item("Acme Corp — Engineer", 100, "Helvetica-Bold")],
      [item("Built APIs", 92)],
      [item("Globex — Lead", 60, "Helvetica-Bold")],
      [item("Led platform team", 52)],
    ];
    const subsections = divideSectionIntoSubsections(lines);
    expect(subsections.length).toBe(2);
    expect(subsections[0][0][0].text).toMatch(/Acme/);
    expect(subsections[1][0][0].text).toMatch(/Globex/);
  });

  it("falls back to bold-line subsection breaks", () => {
    const lines = [
      [item("Acme Corp", 80, "Helvetica-Bold")],
      [item("Built APIs", 78)],
      [item("Globex Corp", 76, "Helvetica-Bold")],
      [item("Led team", 74)],
    ];
    const subsections = divideSectionIntoSubsections(lines);
    expect(subsections.length).toBe(2);
  });

  it("returns single subsection for uniform spacing", () => {
    const lines = [
      [item("Line one", 50)],
      [item("Line two", 48)],
      [item("Line three", 46)],
    ];
    expect(divideSectionIntoSubsections(lines)).toHaveLength(1);
  });
});
