import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRAND,
  BRAND_APPLY_CTA,
  BRAND_FULL,
  BRAND_NAME,
  BRAND_SUFFIX,
  EASYSUBMIT_TAGLINE,
  brandCopyright,
  renderBrandMarkup,
} from "@/lib/brand";

describe("BRAND", () => {
  it("uses EasySubmit.ai casing (E and S caps only)", () => {
    expect(BRAND.name).toBe("EasySubmit");
    expect(BRAND.suffix).toBe(".ai");
    expect(BRAND.full).toBe("EasySubmit.ai");
    expect(BRAND.applyCta).toBe("Apply with EasySubmit");
    expect(BRAND_FULL).toBe(BRAND.full);
    expect(BRAND_NAME).toBe(BRAND.name);
    expect(BRAND_SUFFIX).toBe(BRAND.suffix);
    expect(BRAND_APPLY_CTA).toBe(BRAND.applyCta);
    expect(EASYSUBMIT_TAGLINE).toBe(BRAND.tagline);
  });

  it("renders split wordmark markup for extension shadow DOM", () => {
    expect(renderBrandMarkup()).toBe(
      '<span class="brand"><span class="brand-name">EasySubmit</span><span class="brand-suffix">.ai</span></span>',
    );
  });

  it("formats copyright with full brand name", () => {
    expect(brandCopyright(2026)).toBe("© 2026 EasySubmit.ai");
  });
});

describe("extension manifest branding", () => {
  it("matches central BRAND.extension copy", () => {
    const manifestPath = resolve(process.cwd(), "extension/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      description: string;
      action: { default_title: string };
    };

    expect(manifest.name).toBe(BRAND.extension.manifestName);
    expect(manifest.description).toBe(BRAND.extension.manifestDescription);
    expect(manifest.action.default_title).toBe(BRAND.extension.actionTitle);
  });
});
