import { describe, expect, it } from "vitest";
import {
  computeFitScale,
  DEFAULT_PAGE_SIZE_ID,
  getPageSizeSpec,
  pageCountForContent,
  pageDimensionsPx,
} from "@/lib/resume/page-sizes";

describe("page-sizes", () => {
  it("defaults to A4", () => {
    expect(DEFAULT_PAGE_SIZE_ID).toBe("a4");
    expect(getPageSizeSpec("a4").widthMm).toBe(210);
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
});
