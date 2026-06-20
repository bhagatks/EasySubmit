import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESUME_FONT_ID,
  getResumeFontStack,
  RESUME_FONTS,
} from "@/lib/resume/resume-fonts";

describe("resume-fonts", () => {
  it("defaults to Calibri", () => {
    expect(DEFAULT_RESUME_FONT_ID).toBe("calibri");
  });

  it("includes ATS-safe families from product rules", () => {
    const ids = RESUME_FONTS.map((font) => font.id);
    expect(ids).toContain("arial");
    expect(ids).toContain("calibri");
    expect(ids).toContain("helvetica");
  });

  it("returns a CSS stack for each font", () => {
    expect(getResumeFontStack("arial")).toMatch(/Arial/i);
    expect(getResumeFontStack("times-new-roman")).toMatch(/Times New Roman/i);
  });
});
