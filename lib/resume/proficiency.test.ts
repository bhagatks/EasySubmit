import { describe, expect, it } from "vitest";
import { formatProficiencyShort } from "@/lib/resume/proficiency";

describe("formatProficiencyShort", () => {
  it("returns empty string for empty input", () => {
    expect(formatProficiencyShort("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(formatProficiencyShort("   ")).toBe("");
  });

  it("maps Native or Bilingual to Native", () => {
    expect(formatProficiencyShort("Native or Bilingual")).toBe("Native");
  });

  it("maps Full Professional case-insensitively", () => {
    expect(formatProficiencyShort("full professional")).toBe("Full Professional");
  });

  it("maps Professional Working to Professional", () => {
    expect(formatProficiencyShort("Professional Working")).toBe("Professional");
  });

  it("maps Limited Working to Limited", () => {
    expect(formatProficiencyShort("Limited Working")).toBe("Limited");
  });

  it("maps Elementary to Elementary", () => {
    expect(formatProficiencyShort("Elementary")).toBe("Elementary");
  });

  it("returns unknown level as-is", () => {
    expect(formatProficiencyShort("Intermediate")).toBe("Intermediate");
  });

  it("trims whitespace before matching", () => {
    expect(formatProficiencyShort("  Native or Bilingual  ")).toBe("Native");
  });
});
