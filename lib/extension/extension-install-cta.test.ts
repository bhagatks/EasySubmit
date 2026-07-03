import { describe, expect, it } from "vitest";
import { shouldShowExtensionInstallCta } from "@/lib/extension/extension-install-cta";

describe("shouldShowExtensionInstallCta", () => {
  it("hides install CTA while connection is unknown or connected", () => {
    expect(shouldShowExtensionInstallCta(null)).toBe(false);
    expect(shouldShowExtensionInstallCta(true)).toBe(false);
  });

  it("shows install CTA only when extension is not connected", () => {
    expect(shouldShowExtensionInstallCta(false)).toBe(true);
  });
});
