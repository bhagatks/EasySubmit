import { describe, expect, it } from "vitest";
import {
  BUTTON_PURPOSE_META,
  BRAND_BUTTONS,
  extensionButtonClass,
  extensionButtonStyles,
  extensionPopupButtonCss,
  webButtonPurposeProps,
} from "@/src/shared/brand-buttons";
import { BRAND_COLORS } from "@/src/shared/brand-colors";

describe("BRAND_BUTTONS purposes", () => {
  it("defines the same primary/secondary/chip purposes on web and extension", () => {
    for (const purpose of ["primary", "secondary", "chip", "ghost", "saved"] as const) {
      expect(BUTTON_PURPOSE_META[purpose].surfaces).toContain("web");
      expect(BUTTON_PURPOSE_META[purpose].surfaces).toContain("extension");
    }
  });

  it("reserves status purpose for web only", () => {
    expect(BUTTON_PURPOSE_META.status.surfaces).toEqual(["web"]);
  });

  it("maps web and extension primary to different visual patterns", () => {
    const web = webButtonPurposeProps("primary");
    const ext = extensionButtonClass("primary", { legacyCta: true });
    expect(web.variant).toBe("hero");
    expect(ext).toContain("cta-primary");
    expect(extensionButtonStyles()).toContain(BRAND_COLORS.gradient.primary);
  });

  it("uses 12px radius globally", () => {
    expect(BRAND_BUTTONS.radius).toBe("12px");
  });

  it("renders extension styles without legacy teal", () => {
    const css = extensionButtonStyles();
    expect(css).toContain(".es-btn-secondary");
    expect(css).not.toMatch(/#12[Bb]3[Dd]1/);
  });

  it("renders popup primary from brand hex", () => {
    expect(extensionPopupButtonCss()).toContain(BRAND_COLORS.primary.hex);
  });
});
