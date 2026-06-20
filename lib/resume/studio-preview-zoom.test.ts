import { describe, expect, it } from "vitest";
import {
  clampStudioZoom,
  DEFAULT_STUDIO_ZOOM,
  formatStudioZoomPercent,
  MAX_STUDIO_ZOOM,
  MIN_STUDIO_ZOOM,
  stepStudioZoom,
} from "./studio-preview-zoom";

describe("studio-preview-zoom", () => {
  it("clamps zoom within bounds", () => {
    expect(clampStudioZoom(0.1)).toBe(MIN_STUDIO_ZOOM);
    expect(clampStudioZoom(3)).toBe(MAX_STUDIO_ZOOM);
    expect(clampStudioZoom(1.234)).toBe(1.23);
  });

  it("steps zoom in and out", () => {
    expect(stepStudioZoom(DEFAULT_STUDIO_ZOOM, "in")).toBe(1.1);
    expect(stepStudioZoom(DEFAULT_STUDIO_ZOOM, "out")).toBe(0.9);
    expect(stepStudioZoom(MIN_STUDIO_ZOOM, "out")).toBe(MIN_STUDIO_ZOOM);
    expect(stepStudioZoom(MAX_STUDIO_ZOOM, "in")).toBe(MAX_STUDIO_ZOOM);
  });

  it("formats zoom as percent", () => {
    expect(formatStudioZoomPercent(1)).toBe("100%");
    expect(formatStudioZoomPercent(1.25)).toBe("125%");
  });
});
