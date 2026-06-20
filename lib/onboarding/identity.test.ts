import { describe, expect, it } from "vitest";
import { isIdentityPhaseComplete } from "@/lib/onboarding/identity";

describe("isIdentityPhaseComplete", () => {
  it("returns false when targetRole is empty or whitespace", () => {
    expect(isIdentityPhaseComplete({ targetRole: "" })).toBe(false);
    expect(isIdentityPhaseComplete({ targetRole: "   " })).toBe(false);
  });

  it("returns true when target role is set (languages not required)", () => {
    expect(isIdentityPhaseComplete({ targetRole: "Product Manager" })).toBe(true);
    expect(isIdentityPhaseComplete({ targetRole: "  AI Engineer  " })).toBe(true);
  });
});
