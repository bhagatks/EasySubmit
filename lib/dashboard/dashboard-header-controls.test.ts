import { describe, expect, it } from "vitest";
import {
  dashboardScreenHasByokUi,
  isDashboardDetailScreen,
  shouldShowDashboardByokKeyButton,
  shouldShowDashboardSignOut,
} from "@/lib/dashboard/dashboard-header-controls";

describe("dashboard-header-controls", () => {
  it("treats resume studio edit as detail screen", () => {
    expect(isDashboardDetailScreen("/dashboard/resume-profiles/abc/edit")).toBe(true);
    expect(isDashboardDetailScreen("/dashboard/resume-profiles")).toBe(false);
  });

  it("shows sign out only on settings", () => {
    expect(shouldShowDashboardSignOut("/dashboard/settings")).toBe(true);
    expect(shouldShowDashboardSignOut("/dashboard/resume-profiles/abc/edit")).toBe(false);
    expect(shouldShowDashboardSignOut("/dashboard/job-tracker")).toBe(false);
    expect(shouldShowDashboardSignOut("/dashboard")).toBe(false);
  });

  it("shows BYOK KEY on resume studio edit when cold", () => {
    expect(shouldShowDashboardByokKeyButton("/dashboard/resume-profiles/abc/edit", null)).toBe(
      true,
    );
  });

  it("shows BYOK KEY when cold and screen has no BYOK UI", () => {
    expect(shouldShowDashboardByokKeyButton("/dashboard", null)).toBe(true);
    expect(shouldShowDashboardByokKeyButton("/dashboard/job-tracker", null)).toBe(true);
    expect(shouldShowDashboardByokKeyButton("/dashboard/keys", null)).toBe(false);
    expect(shouldShowDashboardByokKeyButton("/dashboard/settings", null)).toBe(false);
    expect(shouldShowDashboardByokKeyButton("/dashboard", "vault-id")).toBe(false);
  });

  it("treats settings and keys as BYOK-present screens", () => {
    expect(dashboardScreenHasByokUi("/dashboard/settings", null)).toBe(true);
    expect(dashboardScreenHasByokUi("/dashboard/keys", null)).toBe(true);
    expect(dashboardScreenHasByokUi("/dashboard", "vault-id")).toBe(true);
  });
});
