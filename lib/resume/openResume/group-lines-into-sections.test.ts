import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import { groupLinesIntoSections, PROFILE_SECTION } from "@/lib/resume/openResume/group-lines-into-sections";

function item(text: string, y: number, fontName = "Arial"): TextItem {
  return { text, x: 0, y, width: 200, height: 12, fontName, hasEOL: true };
}

describe("groupLinesIntoSections", () => {
  it("groups lines under section titles", () => {
    const lines = [
      [item("Jane Doe", 200)],
      [item("jane@example.com", 190)],
      [item("PROFESSIONAL EXPERIENCE", 160, "Helvetica-Bold")],
      [item("Engineer at Acme", 150)],
      [item("SKILLS", 120, "Helvetica-Bold")],
      [item("Python, AWS", 110)],
    ];
    const sections = groupLinesIntoSections(lines);
    expect(sections[PROFILE_SECTION]).toHaveLength(2);
    expect(sections["PROFESSIONAL EXPERIENCE"]).toHaveLength(1);
    expect(sections.SKILLS).toHaveLength(1);
  });

  it("keeps profile lines when no section titles detected", () => {
    const lines = [[item("Jane Doe", 100)], [item("Engineer", 90)]];
    const sections = groupLinesIntoSections(lines);
    expect(sections[PROFILE_SECTION]).toHaveLength(2);
  });
});
