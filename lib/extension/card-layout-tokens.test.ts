import { describe, expect, it } from "vitest";
import {
  CARD_NAV_LABELS,
  CARD_STUDIO_LABEL,
  EXTENSION_CARD_LAYOUT,
  extensionCardLayoutCssVars,
} from "@/src/shared/extension/card-layout-tokens";

describe("card-layout-tokens", () => {
  it("uses a 4px grid for core spacing", () => {
    expect(EXTENSION_CARD_LAYOUT.paddingX % 4).toBe(0);
    expect(EXTENSION_CARD_LAYOUT.ctaZoneMarginTop).toBe(12);
    expect(EXTENSION_CARD_LAYOUT.ctaZonePaddingTop).toBe(12);
  });

  it("exports stable nav labels", () => {
    expect(CARD_NAV_LABELS.jobInfo).toBe("Job Info");
    expect(CARD_STUDIO_LABEL).toBe("Resume Studio");
  });

  it("emits css variables for shadow dom", () => {
    expect(extensionCardLayoutCssVars()).toContain("--es-card-px");
    expect(extensionCardLayoutCssVars()).toContain("--es-cta-zone-mt");
  });
});
