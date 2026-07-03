import { describe, expect, it } from "vitest";
import { dashboardShowsTrackerIssueAsError } from "@/lib/job-tracker/tracker-issue-display";

describe("dashboardShowsTrackerIssueAsError", () => {
  it("treats capture gaps as warnings once apply assist is ready", () => {
    expect(
      dashboardShowsTrackerIssueAsError("Capture gap: Company", "READY_TO_APPLY"),
    ).toBe(false);
  });

  it("treats tailor failures as blocking errors", () => {
    expect(dashboardShowsTrackerIssueAsError("Tailor failed", "CAPTURED")).toBe(true);
  });
});
