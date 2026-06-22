import { describe, expect, it } from "vitest";
import { countJobsTracked } from "@/lib/job-tracker/counts";

describe("countJobsTracked", () => {
  it("sums active statuses and ignores archived", () => {
    expect(
      countJobsTracked({
        CAPTURED: 3,
        APPLIED: 2,
        INTERVIEW: 1,
        ARCHIVED: 99,
      }),
    ).toBe(6);
  });

  it("returns zero when empty", () => {
    expect(countJobsTracked({})).toBe(0);
  });
});
