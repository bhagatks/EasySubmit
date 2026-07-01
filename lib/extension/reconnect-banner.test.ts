import { describe, expect, it } from "vitest";
import {
  isExtensionReconnectRequiredError,
  resolveExtensionReconnectBanner,
  shouldHideSaveErrorForReconnectBanner,
} from "@/src/shared/extension/reconnect-banner";

describe("reconnect-banner", () => {
  it("detects server reconnect code and copy", () => {
    expect(
      isExtensionReconnectRequiredError(
        "Your extension session is out of date. Open EasySubmit, sign in again, and reconnect from Settings.",
        "EXTENSION_RECONNECT_REQUIRED",
      ),
    ).toBe(true);

    const banner = resolveExtensionReconnectBanner(
      "Your extension session is out of date. Sign in again and reconnect from Settings.",
      "EXTENSION_RECONNECT_REQUIRED",
    );
    expect(banner?.ctaLabel).toBe("Open dashboard");
    expect(banner?.message).toContain("out of date");
  });

  it("ignores unrelated errors", () => {
    expect(isExtensionReconnectRequiredError("Daily enhancement limit reached")).toBe(false);
    expect(resolveExtensionReconnectBanner("Unauthorized")).toBeNull();
  });

  it("hides duplicate save error when banner is shown", () => {
    const error =
      "Your extension session is out of date. Sign in again and reconnect from Settings.";
    const banner = resolveExtensionReconnectBanner(error);
    expect(shouldHideSaveErrorForReconnectBanner(banner, error)).toBe(true);
    expect(shouldHideSaveErrorForReconnectBanner(banner, "Other error")).toBe(false);
  });
});
