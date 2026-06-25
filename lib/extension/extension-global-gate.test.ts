import { describe, expect, it } from "vitest";
import {
  isExtensionGloballyEnabled,
  isExtensionGlobalSwitchOn,
} from "@/src/shared/extension/extension-global-switch";

describe("extension global switch helpers", () => {
  it("isExtensionGloballyEnabled requires explicit true", () => {
    expect(isExtensionGloballyEnabled({ extensionGlobalSwitch: true })).toBe(true);
    expect(isExtensionGloballyEnabled({ extensionGlobalSwitch: false })).toBe(false);
  });

  it("isExtensionGlobalSwitchOn defaults missing config to on", () => {
    expect(isExtensionGlobalSwitchOn(null)).toBe(true);
    expect(isExtensionGlobalSwitchOn({ extensionGlobalSwitch: false })).toBe(false);
  });
});
