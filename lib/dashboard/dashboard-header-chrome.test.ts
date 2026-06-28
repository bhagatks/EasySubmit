import { describe, expect, it } from "vitest";
import {
  DASHBOARD_TOPBAR_BORDER_CLASS,
  DASHBOARD_TOPBAR_HEIGHT_CLASS,
  dashboardHeaderMintPillClassName,
  dashboardHeaderNeutralPillClassName,
  dashboardHeaderNeutralPillStyle,
  dashboardHeaderMintPillStyle,
  dashboardHeaderWarningPillClassName,
  dashboardHeaderWarningPillStyle,
  dashboardHeaderControlClassName,
  dashboardTopBarClassName,
} from "@/lib/dashboard/dashboard-header-chrome";

describe("dashboard-header-chrome", () => {
  it("exports shared topbar constants", () => {
    expect(DASHBOARD_TOPBAR_HEIGHT_CLASS).toBe("h-14");
    expect(DASHBOARD_TOPBAR_BORDER_CLASS).toContain("border-b");
  });

  it("dashboardTopBarClassName merges base classes with optional className", () => {
    const result = dashboardTopBarClassName("extra-class");
    expect(result).toContain(DASHBOARD_TOPBAR_HEIGHT_CLASS);
    expect(result).toContain(DASHBOARD_TOPBAR_BORDER_CLASS);
    expect(result).toContain("extra-class");
  });

  it("pill className helpers include shared control class", () => {
    expect(dashboardHeaderMintPillClassName()).toContain(dashboardHeaderControlClassName);
    expect(dashboardHeaderWarningPillClassName("warn")).toContain("warn");
    expect(dashboardHeaderNeutralPillClassName()).toContain("border");
  });

  it("exports oklch pill style tokens", () => {
    expect(dashboardHeaderMintPillStyle.color).toContain("oklch");
    expect(dashboardHeaderWarningPillStyle.borderColor).toContain("oklch");
    expect(dashboardHeaderNeutralPillStyle.backgroundColor).toContain("oklch");
  });
});
