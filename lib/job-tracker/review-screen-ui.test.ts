import { describe, expect, it } from "vitest";
import {
  defaultReviewScreenPanel,
  jobTrackerReviewScreenUrl,
  jobTrackerReviewStudioUrl,
} from "@/lib/job-tracker/review-screen-ui";
import { canStartApply, pipelineActiveSegmentLabel, pipelineProgressForStatus } from "@/lib/job-tracker/pipeline-progress";
import { BRAND } from "@/src/shared/brand";

describe("review-screen-ui", () => {
  it("maps status to default panel", () => {
    expect(defaultReviewScreenPanel("CAPTURED")).toBe("job");
    expect(defaultReviewScreenPanel("RESUME_READY")).toBe("resume");
    expect(defaultReviewScreenPanel("READY_TO_APPLY")).toBe("resume");
  });

  it("builds Review Screen deep links", () => {
    expect(jobTrackerReviewScreenUrl("abc", "cover")).toBe(
      "/dashboard/job-tracker?job=abc&panel=cover",
    );
    expect(jobTrackerReviewStudioUrl("abc")).toBe(
      "/dashboard/job-tracker/abc/resume?from=review",
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
    expect(pipelineProgressForStatus("RESUME_READY")).toEqual({
      filledThrough: 2,
      currentIndex: 3,
      isComplete: false,
    });
    expect(pipelineProgressForStatus("READY_TO_APPLY")).toEqual({
      filledThrough: 2,
      currentIndex: 3,
      isComplete: false,
    });
    expect(pipelineProgressForStatus("APPLIED").isComplete).toBe(true);
    expect(pipelineProgressForStatus("APPLIED").filledThrough).toBe(4);
    expect(pipelineProgressForStatus("APPLIED").currentIndex).toBeNull();
  });

  it("gates Apply by ready-to-apply status", () => {
    expect(canStartApply("CAPTURED")).toBe(false);
    expect(canStartApply("RESUME_READY")).toBe(false);
    expect(canStartApply("READY_TO_APPLY")).toBe(true);
    expect(canStartApply("APPLIED")).toBe(false);
  });

  it("labels the active segment for resume-ready and apply-assist states", () => {
    expect(pipelineActiveSegmentLabel("CAPTURED")).toBe("Optimizing resume");
    expect(pipelineActiveSegmentLabel("RESUME_READY")).toBe(BRAND.autoSuggestCta);
    expect(pipelineActiveSegmentLabel("READY_TO_APPLY")).toBe(BRAND.autoSuggestCta);
    expect(pipelineActiveSegmentLabel("APPLIED")).toBeNull();
  });
});
