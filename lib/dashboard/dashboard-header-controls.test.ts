import { describe, expect, it } from "vitest";
import {
  dashboardScreenHasByokUi,
  getDashboardHeaderLabel,
  isDashboardDetailScreen,
  isJobReviewStudioScreen,
  shouldShowDashboardByokKeyButton,
  shouldShowDashboardProfileMenu,
  shouldShowDashboardSignOut,
} from "@/lib/dashboard/dashboard-header-controls";

describe("dashboard-header-controls", () => {
  it("treats resume studio edit as detail screen", () => {
    expect(isDashboardDetailScreen("/dashboard/resume-profiles/abc/edit")).toBe(true);
    expect(isDashboardDetailScreen("/dashboard/resume-profiles")).toBe(false);
    expect(
      isDashboardDetailScreen("/dashboard/job-tracker/job-1/resume", "review"),
    ).toBe(true);
    expect(isDashboardDetailScreen("/dashboard/job-tracker/job-1/resume")).toBe(false);
  });

  it("detects review-context job studio route", () => {
    expect(isJobReviewStudioScreen("/dashboard/job-tracker/job-1/resume", "review")).toBe(
      true,
    );
    expect(isJobReviewStudioScreen("/dashboard/job-tracker/job-1/resume", null)).toBe(false);
  });

  it("shows sign out only on settings", () => {
    expect(shouldShowDashboardSignOut("/dashboard/settings")).toBe(true);
    expect(shouldShowDashboardSignOut("/dashboard/resume-profiles/abc/edit")).toBe(false);
    expect(shouldShowDashboardSignOut("/dashboard/job-tracker")).toBe(false);
    expect(shouldShowDashboardSignOut("/dashboard")).toBe(false);
  });

  it("shows profile menu on dashboard screens except settings and resume studio", () => {
    expect(shouldShowDashboardProfileMenu("/dashboard/settings")).toBe(false);
    expect(shouldShowDashboardProfileMenu("/dashboard")).toBe(true);
    expect(shouldShowDashboardProfileMenu("/dashboard/resume-profiles/abc/edit")).toBe(false);
    expect(
      shouldShowDashboardProfileMenu("/dashboard/job-tracker/job-1/resume", "review"),
    ).toBe(false);
    expect(shouldShowDashboardProfileMenu("/dashboard/job-tracker")).toBe(true);
  });

  it("shows BYOK KEY on resume studio edit when cold", () => {
    expect(shouldShowDashboardByokKeyButton("/dashboard/resume-profiles/abc/edit", null)).toBe(
      true,
    );
  });

  it("shows BYOK KEY when cold and screen has no BYOK UI", () => {
    expect(shouldShowDashboardByokKeyButton("/dashboard", null)).toBe(true);
    expect(shouldShowDashboardByokKeyButton("/dashboard/job-tracker", null)).toBe(true);
    expect(shouldShowDashboardByokKeyButton("/dashboard/settings", null)).toBe(false);
    expect(shouldShowDashboardByokKeyButton("/dashboard", "vault-id")).toBe(false);
  });

  it("treats settings as BYOK-present screen", () => {
    expect(dashboardScreenHasByokUi("/dashboard/settings", null)).toBe(true);
    expect(dashboardScreenHasByokUi("/dashboard", "vault-id")).toBe(true);
    expect(dashboardScreenHasByokUi("/dashboard/job-tracker", null)).toBe(false);
  });

  it("resolves workspace header labels from pathname", () => {
    expect(getDashboardHeaderLabel("/dashboard", false)).toBe("Dashboard");
    expect(getDashboardHeaderLabel("/dashboard/about", false)).toBe("About");
    expect(getDashboardHeaderLabel("/dashboard/ats-guidelines", false)).toBe("ATS Guidelines");
    expect(getDashboardHeaderLabel("/dashboard/settings", false)).toBe("Settings");
    expect(getDashboardHeaderLabel("/dashboard/resume-profiles", false)).toBe("Resume profiles");
    expect(getDashboardHeaderLabel("/dashboard/job-tracker", false)).toBe("Job Tracker");
    expect(getDashboardHeaderLabel("/dashboard/resume-profiles/abc/edit", true)).toBe(
      "Resume Studio",
    );
  });
});
