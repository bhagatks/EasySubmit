import { describe, expect, it } from "vitest";
import { parseCareersOgTitleMeta } from "@/src/shared/extension/careers-og-meta";

describe("parseCareersOgTitleMeta", () => {
  it("parses CVS Phenom og:title", () => {
    const result = parseCareersOgTitleMeta(
      "Lead Director, Software Development Engineering in Work at Home, Texas, United States | Innovation and Technology at CVS Health Job",
    );

    expect(result.title).toBe("Lead Director, Software Development Engineering");
    expect(result.location).toBe("Work at Home, Texas, United States");
    expect(result.company).toBe("CVS Health");
  });
});
