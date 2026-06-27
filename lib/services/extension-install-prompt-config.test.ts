import { describe, expect, it } from "vitest";
import {
  EXTENSION_INSTALL_PROMPT_DEFAULTS,
  parseExtensionInstallPromptConfig,
  resolveExtensionInstallPromptConfig,
} from "@/src/lib/services/extension-install-prompt-config";

describe("extension-install-prompt-config", () => {
  it("parses refreshIntervalMinutes", () => {
    expect(parseExtensionInstallPromptConfig({ refreshIntervalMinutes: 15 })).toEqual({
      refreshIntervalMinutes: 15,
      dashboardVisit: false,
      tabFocusReturn: false,
      periodicRefresh: false,
    });
  });

  it("accepts legacy extensionInstallPromptRefreshTime key", () => {
    expect(parseExtensionInstallPromptConfig({ extensionInstallPromptRefreshTime: 45 })).toEqual({
      refreshIntervalMinutes: 45,
      dashboardVisit: false,
      tabFocusReturn: false,
      periodicRefresh: false,
    });
  });

  it("parses trigger flags", () => {
    expect(
      parseExtensionInstallPromptConfig({
        refreshIntervalMinutes: 10,
        dashboardVisit: true,
        tabFocusReturn: true,
        periodicRefresh: true,
      }),
    ).toEqual({
      refreshIntervalMinutes: 10,
      dashboardVisit: true,
      tabFocusReturn: true,
      periodicRefresh: true,
    });
  });

  it("falls back to defaults when invalid", () => {
    expect(parseExtensionInstallPromptConfig(null)).toBeNull();
    expect(resolveExtensionInstallPromptConfig(null)).toEqual(
      EXTENSION_INSTALL_PROMPT_DEFAULTS,
    );
  });
});
