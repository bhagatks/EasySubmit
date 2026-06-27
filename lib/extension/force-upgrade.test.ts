import { describe, expect, it } from "vitest";
import { compareSemver, isSemverBelowMinimum } from "@/src/shared/extension/semver";
import {
  getExtensionForceUpgradeBlockMessage,
  isExtensionForceUpgradeRequired,
  resolveExtensionForceUpgradeBanner,
} from "@/src/shared/extension/extension-force-upgrade";
import {
  EXTENSION_FORCE_UPGRADE_DEFAULTS,
  parseExtensionForceUpgradeConfig,
} from "@/src/lib/services/extension-force-upgrade-config";

describe("compareSemver", () => {
  it("orders dotted versions numerically", () => {
    expect(compareSemver("0.2.6", "0.2.10")).toBeLessThan(0);
    expect(compareSemver("0.2.10", "0.2.6")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("parseExtensionForceUpgradeConfig", () => {
  it("returns defaults for invalid payloads", () => {
    expect(parseExtensionForceUpgradeConfig(null)).toEqual(EXTENSION_FORCE_UPGRADE_DEFAULTS);
  });

  it("parses enabled flag and semver fields", () => {
    expect(
      parseExtensionForceUpgradeConfig({
        enabled: true,
        minVersion: "0.3.0",
        updateUrl: "https://example.com/store",
        message: "Update now.",
      }),
    ).toEqual({
      enabled: true,
      minVersion: "0.3.0",
      updateUrl: "https://example.com/store",
      message: "Update now.",
    });
  });
});

describe("isExtensionForceUpgradeRequired", () => {
  const config = {
    forceUpgradeEnabled: true,
    minExtensionVersion: "0.2.8",
    forceUpgradeMessage: "Please update.",
    forceUpgradeUpdateUrl: "/extension",
  };

  it("requires update when current version is below minimum", () => {
    expect(isExtensionForceUpgradeRequired(config, "0.2.6")).toBe(true);
    expect(getExtensionForceUpgradeBlockMessage(config, "0.2.6")).toBe("Please update.");
  });

  it("allows current and newer builds", () => {
    expect(isExtensionForceUpgradeRequired(config, "0.2.8")).toBe(false);
    expect(isExtensionForceUpgradeRequired(config, "0.3.0")).toBe(false);
  });

  it("is off when force upgrade is disabled", () => {
    expect(
      isExtensionForceUpgradeRequired(
        { ...config, forceUpgradeEnabled: false },
        "0.1.0",
      ),
    ).toBe(false);
  });
});

describe("resolveExtensionForceUpgradeBanner", () => {
  it("returns update CTA metadata", () => {
    const banner = resolveExtensionForceUpgradeBanner(
      {
        forceUpgradeEnabled: true,
        minExtensionVersion: "0.3.0",
        forceUpgradeMessage: "Update required.",
        forceUpgradeUpdateUrl: "https://chromewebstore.google.com/detail/example",
      },
      "0.2.6",
    );
    expect(banner?.ctaLabel).toBe("Update");
    expect(banner?.updateUrl).toContain("chromewebstore");
    expect(isSemverBelowMinimum("0.2.6", "0.3.0")).toBe(true);
  });
});
