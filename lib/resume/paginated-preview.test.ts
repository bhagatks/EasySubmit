import { describe, expect, it } from "vitest";
import {
  computeFitScale,
  DEFAULT_PAGE_SIZE_ID,
  getPageSizeSpec,
  PAGE_SIZES,
  pageCountForContent,
  pageDimensionsPx,
} from "@/lib/resume/page-sizes";

describe("page-sizes", () => {
  it("defaults to US Letter", () => {
    expect(DEFAULT_PAGE_SIZE_ID).toBe("letter");
    expect(getPageSizeSpec("letter").widthMm).toBeCloseTo(215.9, 1);
  });

  it("only exposes ATS-standard letter and A4 sizes", () => {
    expect(PAGE_SIZES.map((size) => size.id)).toEqual(["letter", "a4"]);
  });

  it("derives page height from width and aspect ratio", () => {
    const { widthPx, heightPx } = pageDimensionsPx("a4", 210);
    expect(widthPx).toBe(210);
    expect(heightPx).toBeCloseTo(297, 0);
  });

  it("counts pages from content height", () => {
    expect(pageCountForContent(500, 297)).toBe(2);
    expect(pageCountForContent(200, 297)).toBe(1);
  });

  it("fit scale never exceeds 1", () => {
    const scale = computeFitScale(400, 800, 600, 900, 24);
    expect(scale).toBeLessThanOrEqual(1);
    expect(scale).toBeGreaterThan(0);
  });

  it("returns 1 when viewport is not measured yet", () => {
    expect(computeFitScale(480, 677, 400, 0, 16)).toBe(1);
    expect(computeFitScale(480, 677, 0, 500, 16)).toBe(1);
  });
});
