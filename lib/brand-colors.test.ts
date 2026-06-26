import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_COLORS, brandExtensionTokens } from "@/src/shared/brand-colors";

describe("BRAND_COLORS", () => {
  it("logo fill matches primary engine glow hex", () => {
    expect(BRAND_COLORS.logo.fill).toBe(BRAND_COLORS.primary.hex);
  });

  it("syncs with app/globals.css primary oklch", () => {
    const globals = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(globals).toContain(BRAND_COLORS.primary.oklch);
    expect(globals).toContain(BRAND_COLORS.gradient.primary);
  });

  it("syncs extension icon.svg fill with logo token", () => {
    const iconSvg = readFileSync(
      resolve(process.cwd(), "extension/icons/icon.svg"),
      "utf8",
    );
    expect(iconSvg).toContain(`fill="${BRAND_COLORS.logo.fill}"`);
  });

  it("does not leave legacy teal in extension content sources", () => {
    const paths = [
      "extension/src/content/index.ts",
      "extension/src/content/card-ui.ts",
      "extension/src/popup/popup.css",
      "src/shared/extension/stage-nudge.ts",
    ];
    for (const rel of paths) {
      const source = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(source, rel).not.toMatch(/#12[Bb]3[Dd]1/);
      expect(source, rel).not.toMatch(/#0[Ee]9[Cc][Bb]6/);
      expect(source, rel).not.toMatch(/#0[Ee]7490/);
      expect(source, rel).not.toMatch(/rgba\(18,\s*179,\s*209/);
    }
  });

  it("exports extension tokens from primary hex", () => {
    const t = brandExtensionTokens();
    expect(t.primaryHex).toBe(BRAND_COLORS.primary.hex);
    expect(t.a12).toBe("rgba(99, 102, 241, 0.12)");
  });
});
