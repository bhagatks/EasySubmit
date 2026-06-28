import { describe, expect, it } from "vitest";
import {
  formatDashboardDeltaSpend,
  formatDashboardInteger,
  formatDashboardPercent,
  formatDashboardUsd,
} from "@/lib/dashboard/format-stats";

describe("formatDashboardInteger", () => {
  it("formats non-negative integers", () => {
    expect(formatDashboardInteger(1234)).toBe("1,234");
    expect(formatDashboardInteger(0)).toBe("0");
  });

  it("floors and clamps negatives to zero", () => {
    expect(formatDashboardInteger(-5.9)).toBe("0");
    expect(formatDashboardInteger(3.7)).toBe("3");
  });
});

describe("formatDashboardUsd", () => {
  it("formats USD with two decimals", () => {
    expect(formatDashboardUsd(12.5)).toBe("$12.50");
  });

  it("clamps negatives to zero", () => {
    expect(formatDashboardUsd(-1)).toBe("$0.00");
  });
});

describe("formatDashboardPercent", () => {
  it("returns em dash for null or non-positive values", () => {
    expect(formatDashboardPercent(null)).toBe("—");
    expect(formatDashboardPercent(0)).toBe("—");
    expect(formatDashboardPercent(-3)).toBe("—");
  });

  it("rounds positive percentages", () => {
    expect(formatDashboardPercent(42.6)).toBe("43");
  });
});

describe("formatDashboardDeltaSpend", () => {
  it("combines USD formatting with spent suffix", () => {
    expect(formatDashboardDeltaSpend(9.99)).toBe("$9.99 spent");
  });
});
