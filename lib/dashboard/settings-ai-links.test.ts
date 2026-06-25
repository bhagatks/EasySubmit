import { describe, expect, it } from "vitest";
import {
  SETTINGS_AI_AUTO_HREF,
  dashboardSettingsAiAutoHref,
} from "@/lib/dashboard/settings-ai-links";

describe("settings-ai-links", () => {
  it("builds dashboard settings auto deeplink", () => {
    expect(SETTINGS_AI_AUTO_HREF).toBe("/dashboard/settings?aiSource=auto");
    expect(dashboardSettingsAiAutoHref("https://easysubmit.ai")).toBe(
      "https://easysubmit.ai/dashboard/settings?aiSource=auto",
    );
    expect(dashboardSettingsAiAutoHref("https://easysubmit.ai/")).toBe(
      "https://easysubmit.ai/dashboard/settings?aiSource=auto",
    );
  });
});
