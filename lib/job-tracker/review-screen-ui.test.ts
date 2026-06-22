import { describe, expect, it } from "vitest";
import {
  defaultReviewScreenPanel,
  jobTrackerReviewScreenUrl,
} from "@/lib/job-tracker/review-screen-ui";
import { canStartApply, pipelineProgressForStatus } from "@/lib/job-tracker/pipeline-progress";

describe("review-screen-ui", () => {
  it("maps status to default panel", () => {
    expect(defaultReviewScreenPanel("CAPTURED")).toBe("job");
    expect(defaultReviewScreenPanel("RESUME_READY")).toBe("resume");
    expect(defaultReviewScreenPanel("READY_TO_APPLY")).toBe("apply");
  });

  it("builds Review Screen deep links", () => {
    expect(jobTrackerReviewScreenUrl("abc", "cover")).toBe(
      "/dashboard/job-tracker?job=abc&panel=cover",
    );
  });
});

describe("pipeline-progress", () => {
  it("maps pipeline segments by status", () => {
    expect(pipelineProgressForStatus("CAPTURED")).toEqual({
      filledThrough: 1,
      currentIndex: 2,
      isComplete: false,
    });
    expect(pipelineProgressForStatus("APPLIED").isComplete).toBe(true);
    expect(pipelineProgressForStatus("APPLIED").filledThrough).toBe(4);
  });

  it("gates Apply by resume-ready statuses", () => {
    expect(canStartApply("CAPTURED")).toBe(false);
    expect(canStartApply("RESUME_READY")).toBe(true);
    expect(canStartApply("APPLIED")).toBe(false);
  });
});
