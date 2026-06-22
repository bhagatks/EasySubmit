import { describe, expect, it } from "vitest";
import { resolveExtensionProfileSelection } from "@/lib/extension/resolve-profile-selection";
import type { ExtensionResumeProfilesPayload } from "@/lib/extension/resolve-profile-selection";

const basePayload: ExtensionResumeProfilesPayload = {
  profiles: [
    { id: "default-id", label: "Product Manager", isDefault: true },
    { id: "other-id", label: "Engineer", isDefault: false },
  ],
  pickerMode: "DEFAULT",
  defaultProfileId: "default-id",
};

describe("resolveExtensionProfileSelection", () => {
  it("uses default profile when picker mode is DEFAULT", () => {
    expect(resolveExtensionProfileSelection(basePayload, "other-id")).toBe("default-id");
  });

  it("uses last selected when picker mode is LAST_SELECTED and id is valid", () => {
    expect(
      resolveExtensionProfileSelection(
        { ...basePayload, pickerMode: "LAST_SELECTED" },
        "other-id",
      ),
    ).toBe("other-id");
  });

  it("falls back to default when last selected is missing", () => {
    expect(
      resolveExtensionProfileSelection(
        { ...basePayload, pickerMode: "LAST_SELECTED" },
        "stale-id",
      ),
    ).toBe("default-id");
  });
});
