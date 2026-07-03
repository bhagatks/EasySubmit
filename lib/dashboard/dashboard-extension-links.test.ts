import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SETUP_HREF,
  EXTENSION_BRIDGE_HREF,
  extensionBridgeHref,
  dashboardSetupHref,
} from "@/lib/dashboard/dashboard-extension-links";

describe("dashboard-extension-links", () => {
  it("builds dashboard setup deeplink", () => {
    expect(DASHBOARD_SETUP_HREF).toBe("/dashboard?setup=1");
    expect(EXTENSION_BRIDGE_HREF).toBe("/extension/bridge");
    expect(extensionBridgeHref("abc123")).toBe("/extension/bridge?extensionId=abc123");
    expect(extensionBridgeHref()).toBe("/extension/bridge");
    expect(extensionBridgeHref("  ")).toBe("/extension/bridge");
    expect(dashboardSetupHref("https://easysubmit.ai")).toBe(
      "https://easysubmit.ai/dashboard?setup=1",
    );
  });
});
