import { describe, expect, it } from "vitest";
import { resolveSafeCallbackUrl } from "@/lib/auth/safe-callback-url";

describe("resolveSafeCallbackUrl", () => {
  it("preserves extension bridge query string", () => {
    expect(
      resolveSafeCallbackUrl(
        "/extension/bridge?extensionId=icbnhigageinnfopaalnpmifchifpedp",
      ),
    ).toBe("/extension/bridge?extensionId=icbnhigageinnfopaalnpmifchifpedp");
  });

  it("rejects external urls", () => {
    expect(resolveSafeCallbackUrl("https://evil.com")).toBe("/onboarding");
    expect(resolveSafeCallbackUrl("//evil.com")).toBe("/onboarding");
  });
});
