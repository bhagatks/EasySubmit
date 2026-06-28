import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import { groupTextItemsIntoLines } from "@/lib/resume/openResume/group-text-items-into-lines";

function item(
  text: string,
  x: number,
  opts: Partial<TextItem> = {},
): TextItem {
  return {
    text,
    x,
    y: 0,
    width: text.length * 6,
    height: 12,
    fontName: "Arial",
    hasEOL: false,
    ...opts,
  };
}

describe("groupTextItemsIntoLines", () => {
  it("groups items by hasEOL into lines", () => {
    const lines = groupTextItemsIntoLines([
      item("Jane Doe", 0, { hasEOL: true }),
      item("Engineer", 0, { hasEOL: true }),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0][0].text).toBe("Jane Doe");
  });

  it("merges adjacent items when gap is within typical character width", () => {
    const lines = groupTextItemsIntoLines([
      item("Sen", 0, { width: 18 }),
      item("ior", 20, { width: 18 }),
      item("", 0, { hasEOL: true }),
    ]);
    expect(lines[0][0].text.replace(/\s+/g, "")).toMatch(/Senior/i);
  });

  it("inserts space after colon when merging fragments", () => {
    const lines = groupTextItemsIntoLines([
      item("Skills:", 0),
      item("Python", 40),
      item("", 0, { hasEOL: true }),
    ]);
    expect(lines[0][0].text).toMatch(/Skills:\sPython/);
  });
});
