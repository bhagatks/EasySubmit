import { describe, expect, it } from "vitest";
import { isIdentityPhaseComplete, selectIsIdentityComplete } from "@/lib/onboarding/identity";

describe("identity", () => {
  it("requires non-empty target role", () => {
    expect(isIdentityPhaseComplete({ targetRole: "Staff Engineer", languages: [] })).toBe(true);
    expect(isIdentityPhaseComplete({ targetRole: "  ", languages: [] })).toBe(false);
  });

  it("selectIsIdentityComplete reads from store shape", () => {
    expect(
      selectIsIdentityComplete({ identity: { targetRole: "PM", languages: ["English"] } }),
    ).toBe(true);
  });
});
