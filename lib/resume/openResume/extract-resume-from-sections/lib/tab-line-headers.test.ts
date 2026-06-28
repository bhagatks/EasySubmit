import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import {
  extractTrailingDateRange,
  firstNonBulletHeaderLine,
  splitCompanyLocation,
  splitPipeCompanyLocation,
  splitTabLine,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/tab-line-headers";

function item(text: string, x: number, width = 80): TextItem {
  return { text, x, y: 0, width, height: 12, fontName: "Arial", hasEOL: true };
}

describe("splitTabLine", () => {
  it("splits title and date clusters by horizontal gap", () => {
    const line = [item("Senior Engineer", 0, 120), item("Jan 2020 – Present", 200, 100)];
    expect(splitTabLine(line)).toEqual({
      left: "Senior Engineer",
      right: "Jan 2020 – Present",
    });
  });

  it("returns null when gap is too small", () => {
    expect(splitTabLine([item("Title", 0), item("2020", 10)])).toBeNull();
  });
});

describe("splitPipeCompanyLocation", () => {
  it("parses pipe-separated company and location", () => {
    expect(splitPipeCompanyLocation("Acme Corp | San Francisco, CA")).toEqual({
      company: "Acme Corp",
      location: "San Francisco, CA",
    });
  });

  it("parses spaced city/state suffix", () => {
    const result = splitPipeCompanyLocation("Acme Corp San Francisco, CA");
    expect(result?.company).toBeTruthy();
    expect(result?.location).toContain("San Francisco");
  });
});

describe("splitCompanyLocation", () => {
  it("splits em dash separated company and location", () => {
    expect(splitCompanyLocation("Acme — Austin, TX")).toEqual({
      company: "Acme",
      location: "Austin, TX",
    });
  });
});

describe("firstNonBulletHeaderLine", () => {
  it("skips bullet-prefixed lines", () => {
    const lines = [[item("• Built APIs", 0)], [item("Engineer", 0)]];
    expect(firstNonBulletHeaderLine(lines, 0)).toBe(1);
  });
});

describe("extractTrailingDateRange", () => {
  it("extracts title and date from tab line text", () => {
    const result = extractTrailingDateRange("Senior Engineer    Jan 2020 – Present");
    expect(result?.title).toContain("Senior Engineer");
    expect(result?.date).toMatch(/2020/i);
  });
});
