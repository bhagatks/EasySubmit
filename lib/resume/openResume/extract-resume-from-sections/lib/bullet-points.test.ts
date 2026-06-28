import { describe, expect, it } from "vitest";
import type { Lines, TextItem } from "@/lib/resume/openResume/types";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/bullet-points";

function item(text: string, y = 0): TextItem {
  return { text, x: 0, y, width: 100, height: 12, fontName: "Arial", hasEOL: true };
}

function line(...texts: string[]): TextItem[] {
  return texts.map((text) => item(text));
}

describe("getBulletPointsFromLines", () => {
  it("joins plain lines when no bullet glyphs present", () => {
    const lines: Lines = [line("Built scalable APIs"), line("Led team of five engineers")];
    expect(getBulletPointsFromLines(lines)).toEqual([
      "Built scalable APIs",
      "Led team of five engineers",
    ]);
  });

  it("splits on the most common bullet glyph", () => {
    const lines: Lines = [
      line("• Built APIs • Deployed services • Mentored juniors"),
    ];
    expect(getBulletPointsFromLines(lines)).toEqual([
      "Built APIs",
      "Deployed services",
      "Mentored juniors",
    ]);
  });

  it("handles multi-line bullet sections", () => {
    const lines: Lines = [
      line("• ", "Designed system architecture"),
      line("• ", "Reduced latency by 40%"),
    ];
    const bullets = getBulletPointsFromLines(lines);
    expect(bullets.length).toBeGreaterThanOrEqual(1);
    expect(bullets.some((b) => /architecture/i.test(b))).toBe(true);
  });
});

describe("getDescriptionsLineIdx", () => {
  it("returns index of first bullet line", () => {
    const lines: Lines = [
      line("Skills"),
      line("• Python"),
      line("• AWS"),
    ];
    expect(getDescriptionsLineIdx(lines)).toBe(1);
  });

  it("falls back to long single-line paragraph", () => {
    const longText =
      "Led cross functional teams to deliver enterprise platform migrations across three regions";
    const lines: Lines = [line(longText)];
    expect(getDescriptionsLineIdx(lines)).toBe(0);
  });

  it("returns undefined for empty skill headers only", () => {
    const lines: Lines = [line("Skills"), line("Tools")];
    expect(getDescriptionsLineIdx(lines)).toBeUndefined();
  });
});
