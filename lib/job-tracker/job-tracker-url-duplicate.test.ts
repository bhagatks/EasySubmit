import { describe, expect, it } from "vitest";
import {
  formatJobTrackerDuplicateHeadline,
  jobTrackerDuplicateBlockMessage,
  jobTrackerStatusLabel,
  shouldCheckJobTrackerUrlDuplicate,
  toJobTrackerUrlDuplicateSummary,
} from "@/lib/job-tracker/job-tracker-url-duplicate";

describe("job-tracker-url-duplicate", () => {
  const sample = {
    id: "entry-1",
    title: "Software Engineer",
    company: "Acme",
    status: "READY_TO_APPLY" as const,
    canonicalUrl: "https://boards.greenhouse.io/acme/jobs/1",
  };

  it("maps entry to duplicate summary with status label", () => {
    const summary = toJobTrackerUrlDuplicateSummary(sample);
    expect(summary.statusLabel).toBe(jobTrackerStatusLabel("READY_TO_APPLY"));
    expect(formatJobTrackerDuplicateHeadline(summary)).toBe("Software Engineer at Acme");
  });

  it("builds user-facing block message", () => {
    const summary = toJobTrackerUrlDuplicateSummary(sample);
    expect(jobTrackerDuplicateBlockMessage(summary)).toMatch(/already in your Job Tracker/i);
    expect(jobTrackerDuplicateBlockMessage(summary)).toMatch(/Archive or delete/i);
  });

  it("only checks http(s) posting URLs", () => {
    expect(shouldCheckJobTrackerUrlDuplicate("https://example.com/jobs/1")).toBe(true);
    expect(shouldCheckJobTrackerUrlDuplicate("easysubmit://dashboard-manual/abc")).toBe(false);
    expect(shouldCheckJobTrackerUrlDuplicate("")).toBe(false);
    expect(shouldCheckJobTrackerUrlDuplicate(null)).toBe(false);
    expect(shouldCheckJobTrackerUrlDuplicate(undefined)).toBe(false);
  });

  it("labels outcome statuses outside primary kanban", () => {
    expect(jobTrackerStatusLabel("ARCHIVED")).toBe("Archived");
    expect(jobTrackerStatusLabel("INTERVIEW")).toBe("Interview");
    expect(jobTrackerStatusLabel("OFFER")).toBe("Offer");
    expect(jobTrackerStatusLabel("REJECTED")).toBe("Rejected");
  });

  it("formats headline without company or with blank title", () => {
    const noCompany = toJobTrackerUrlDuplicateSummary({ ...sample, company: null });
    expect(formatJobTrackerDuplicateHeadline(noCompany)).toBe("Software Engineer");

    const blankTitle = toJobTrackerUrlDuplicateSummary({
      ...sample,
      title: "  ",
      company: null,
    });
    expect(formatJobTrackerDuplicateHeadline(blankTitle)).toBe("This job");
  });
});
