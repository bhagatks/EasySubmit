import { describe, expect, it } from "vitest";
import { BRAND } from "@/src/shared/brand";
import { jobTrackerStatusLabel } from "@/lib/job-tracker/status-labels";

describe("jobTrackerStatusLabel", () => {
  it("matches the journey state map for pipeline statuses", () => {
    expect(jobTrackerStatusLabel("CAPTURED")).toBe("Optimizing resume");
    expect(jobTrackerStatusLabel("RESUME_READY")).toBe("Resume ready");
    expect(jobTrackerStatusLabel("READY_TO_APPLY")).toBe(BRAND.autoSuggestCta);
    expect(jobTrackerStatusLabel("APPLIED")).toBe("Applied");
  });
});
