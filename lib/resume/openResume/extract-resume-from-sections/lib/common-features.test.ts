import { describe, expect, it } from "vitest";
import type { TextItem } from "@/lib/resume/openResume/types";
import {
  DATE_FEATURE_SETS,
  hasComma,
  hasLetter,
  hasLetterAndIsAllUpperCase,
  hasNumber,
  hasOnlyLettersSpacesAmpersands,
  isBold,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/common-features";

function item(text: string, fontName = "Arial"): TextItem {
  return { text, x: 0, y: 0, width: 100, height: 12, fontName, hasEOL: true };
}

describe("common-features", () => {
  it("detects bold font names", () => {
    expect(isBold(item("Jane Doe", "Helvetica-Bold"))).toBe(true);
    expect(isBold(item("Jane Doe", "Arial"))).toBe(false);
  });

  it("detects letters, numbers, and commas", () => {
    expect(hasLetter(item("ABC"))).toBe(true);
    expect(hasNumber(item("2020"))).toBe(true);
    expect(hasComma(item("San Francisco, CA"))).toBe(true);
  });

  it("detects all-uppercase letter strings", () => {
    expect(hasLetterAndIsAllUpperCase(item("JANE DOE"))).toBe(true);
    expect(hasLetterAndIsAllUpperCase(item("Jane Doe"))).toBe(false);
  });

  it("validates letters-spaces-ampersands pattern", () => {
    expect(hasOnlyLettersSpacesAmpersands(item("Acme & Co"))).toBe(true);
    expect(hasOnlyLettersSpacesAmpersands(item("Acme123"))).toBe(false);
  });

  it("DATE_FEATURE_SETS includes year and present matchers", () => {
    expect(DATE_FEATURE_SETS.length).toBeGreaterThan(0);
    const yearMatcher = DATE_FEATURE_SETS[0][0];
    expect(yearMatcher(item("Jan 2020 – Present"))).toBe(true);
  });
});
