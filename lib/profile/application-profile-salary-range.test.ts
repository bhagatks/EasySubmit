import { describe, expect, it } from "vitest";
import {
  formatProfileSalaryRangeLabel,
  normalizeProfileSalaryRange,
  salaryRangeFromPercent,
  salaryRangeToPercent,
  snapProfileSalary,
} from "@/lib/profile/application-profile-salary-range";

describe("application-profile-salary-range", () => {
  it("snaps values to the configured step", () => {
    expect(snapProfileSalary(122_000)).toBe(120_000);
    expect(snapProfileSalary(123_000)).toBe(125_000);
  });

  it("uses defaults when salary strings are empty", () => {
    expect(normalizeProfileSalaryRange("", "")).toEqual({ min: 100_000, max: 150_000 });
  });

  it("keeps max at or above min", () => {
    expect(normalizeProfileSalaryRange("150000", "120000")).toEqual({
      min: 150_000,
      max: 150_000,
    });
  });

  it("maps slider percent back to salary values", () => {
    const value = salaryRangeFromPercent(salaryRangeToPercent(180_000));
    expect(value).toBe(180_000);
  });

  it("formats a readable salary range label", () => {
    expect(formatProfileSalaryRangeLabel(100_000, 150_000)).toBe("$100,000 – $150,000");
  });
});
