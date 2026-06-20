import { describe, expect, it } from "vitest";
import { resolveBlastOriginFromCell } from "@/lib/keys/blast-origin";

describe("resolveBlastOriginFromCell", () => {
  it("returns console-center fallback when refs are missing", () => {
    expect(resolveBlastOriginFromCell(null, null)).toEqual({ x: 82, y: 50 });
  });

  it("computes origin as percentage of chamber bounds", () => {
    const chamber = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const cell = {
      getBoundingClientRect: () => ({
        left: 750,
        top: 200,
        width: 200,
        height: 80,
        right: 950,
        bottom: 280,
        x: 750,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const origin = resolveBlastOriginFromCell(chamber, cell);
    expect(origin.x).toBe(85);
    expect(origin.y).toBe(48);
  });
});
