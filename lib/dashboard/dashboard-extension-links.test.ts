import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SETUP_HREF,
  dashboardSetupHref,
} from "@/lib/dashboard/dashboard-extension-links";

describe("dashboard-extension-links", () => {
  it("builds dashboard setup deeplink", () => {
    expect(DASHBOARD_SETUP_HREF).toBe("/dashboard?setup=1");
    expect(dashboardSetupHref("https://easysubmit.ai")).toBe(
      "https://easysubmit.ai/dashboard?setup=1",
    );
  });
});
