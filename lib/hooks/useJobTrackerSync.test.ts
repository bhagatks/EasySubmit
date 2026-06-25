import { describe, expect, it } from "vitest";
import {
  JOB_TRACKER_SYNC_POLL_FAST_MS,
  JOB_TRACKER_SYNC_POLL_SLOW_MS,
  resolveJobTrackerPollIntervalMs,
} from "@/lib/hooks/useJobTrackerSync";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";

function entry(status: JobTrackerSummary["status"]): JobTrackerSummary {
  return {
    id: "1",
    title: "Engineer",
    company: null,
    location: null,
    salaryText: null,
    status,
    platform: null,
    canonicalUrl: "https://example.com/job",
    savedAt: new Date().toISOString(),
    appliedAt: null,
  };
}

describe("resolveJobTrackerPollIntervalMs", () => {
  it("uses 3s when any entry is CAPTURED, RESUME_READY, or READY_TO_APPLY", () => {
    expect(resolveJobTrackerPollIntervalMs([entry("CAPTURED")])).toBe(
      JOB_TRACKER_SYNC_POLL_FAST_MS,
    );
    expect(resolveJobTrackerPollIntervalMs([entry("RESUME_READY")])).toBe(
      JOB_TRACKER_SYNC_POLL_FAST_MS,
    );
    expect(resolveJobTrackerPollIntervalMs([entry("READY_TO_APPLY")])).toBe(
      JOB_TRACKER_SYNC_POLL_FAST_MS,
    );
  });

  it("uses 30s when all entries are terminal", () => {
    expect(resolveJobTrackerPollIntervalMs([entry("APPLIED")])).toBe(
      JOB_TRACKER_SYNC_POLL_SLOW_MS,
    );
  });
});
