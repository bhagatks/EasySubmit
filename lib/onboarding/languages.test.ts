import { describe, expect, it } from "vitest";
import {
  formatLanguageChipLabel,
  formatLanguagesForResume,
  formatProficiencyShort,
  hasRequiredLanguages,
} from "@/lib/onboarding/languages";

describe("hasRequiredLanguages", () => {
  it("returns false when no complete language entries exist", () => {
    expect(hasRequiredLanguages([])).toBe(false);
    expect(hasRequiredLanguages([{ name: "", level: "" }])).toBe(false);
    expect(hasRequiredLanguages([{ name: "English", level: "" }])).toBe(false);
  });

  it("returns true when at least one entry has name and level", () => {
    expect(
      hasRequiredLanguages([{ name: "English", level: "Native or Bilingual" }]),
    ).toBe(true);
  });
});

describe("formatLanguagesForResume", () => {
  it("formats complete entries for the resume Languages section", () => {
    expect(
      formatLanguagesForResume([
        { name: "Spanish", level: "Full Professional" },
        { name: "English", level: "Native or Bilingual" },
      ]),
    ).toEqual(["Spanish — Full Professional", "English — Native or Bilingual"]);
  });
});

describe("formatProficiencyShort", () => {
  it("abbreviates known proficiency tiers for chip display", () => {
    expect(formatProficiencyShort("Native or Bilingual")).toBe("Native");
    expect(formatProficiencyShort("Professional Working")).toBe("Professional");
  });
});

describe("formatLanguageChipLabel", () => {
  it("renders language chips as Name (Level)", () => {
    expect(
      formatLanguageChipLabel({
        name: "English",
        level: "Native or Bilingual",
      }),
    ).toBe("English (Native)");
  });
});
