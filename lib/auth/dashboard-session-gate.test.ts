import { describe, expect, it } from "vitest";
import { isDashboardSessionReady } from "@/lib/auth/dashboard-session-gate";

describe("isDashboardSessionReady", () => {
  const baseUser = {
    onboardingStep: 4,
    profiles: [{ id: "profile-1" }],
  };

  it("requires completed onboarding step and a default profile", () => {
    expect(isDashboardSessionReady(baseUser)).toBe(true);
  });

  it("rejects incomplete onboarding", () => {
    expect(
      isDashboardSessionReady({ ...baseUser, onboardingStep: 3 }),
    ).toBe(false);
  });

  it("rejects missing default profile", () => {
    expect(isDashboardSessionReady({ ...baseUser, profiles: [] })).toBe(false);
  });
});
