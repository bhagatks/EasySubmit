import { describe, expect, it } from "vitest";
import {
  buildSettingsSectionExpansion,
  resolveSettingsActionItems,
  SETTINGS_SECTION_IDS,
  settingsSectionHasActionItems,
} from "@/lib/dashboard/settings-action-items";

describe("resolveSettingsActionItems", () => {
  it("flags missing API key and expands ai-keys", () => {
    const items = resolveSettingsActionItems({
      vaultKeyId: null,
      aiSourcePreference: "auto",
      firstName: "Ada",
    });

    expect(items.map((item) => item.id)).toEqual(["add-api-key"]);
    expect(
      buildSettingsSectionExpansion(SETTINGS_SECTION_IDS, items),
    ).toEqual({
      account: false,
      "ai-keys": true,
      general: false,
    });
  });

  it("flags disabled AI and missing key together", () => {
    const items = resolveSettingsActionItems({
      vaultKeyId: null,
      aiSourcePreference: "disabled",
      firstName: "Ada",
    });

    expect(items.map((item) => item.id)).toEqual([
      "enable-ai-enhancements",
      "add-api-key",
    ]);
    expect(settingsSectionHasActionItems("ai-keys", items)).toBe(true);
  });

  it("flags incomplete profile name", () => {
    const items = resolveSettingsActionItems({
      vaultKeyId: "vault-1",
      aiSourcePreference: "auto",
      firstName: "  ",
    });

    expect(items.map((item) => item.id)).toEqual(["complete-profile-name"]);
    expect(
      buildSettingsSectionExpansion(SETTINGS_SECTION_IDS, items).account,
    ).toBe(true);
  });

  it("returns no action items when setup is complete", () => {
    const items = resolveSettingsActionItems({
      vaultKeyId: "vault-1",
      aiSourcePreference: "auto",
      firstName: "Ada",
    });

    expect(items).toEqual([]);
    expect(
      buildSettingsSectionExpansion(SETTINGS_SECTION_IDS, items),
    ).toEqual({
      account: false,
      "ai-keys": false,
      general: false,
    });
  });

  it("skips AI actions when AI is globally disabled", () => {
    const items = resolveSettingsActionItems({
      vaultKeyId: null,
      aiSourcePreference: "disabled",
      firstName: "Ada",
      aiGloballyEnabled: false,
    });

    expect(items).toEqual([]);
  });
});
