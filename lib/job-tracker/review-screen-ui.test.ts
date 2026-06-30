import { describe, expect, it } from "vitest";
import {
  defaultReviewScreenPanel,
  JOB_RESUME_STUDIO_LABEL,
  jobTrackerReviewScreenUrl,
  jobTrackerReviewStudioUrl,
} from "@/lib/job-tracker/review-screen-ui";
import { canStartApply, pipelineActiveBarSegmentLabel, pipelineActiveSegmentLabel, pipelineBarStepLabel, pipelineProgressForStatus } from "@/lib/job-tracker/pipeline-progress";
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

  it("exposes dashboard label for job resume studio", () => {
    expect(JOB_RESUME_STUDIO_LABEL).toBe("Resume Studio");
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

  it("uses compact labels for inline pipeline bars", () => {
    expect(pipelineBarStepLabel({ id: "ready-to-apply", label: BRAND.autoSuggestCta, status: "READY_TO_APPLY" })).toBe(
      "Auto Suggest",
    );
    expect(pipelineActiveBarSegmentLabel("READY_TO_APPLY")).toBe("Auto Suggest");
    expect(pipelineActiveBarSegmentLabel("CAPTURED")).toBe("Optimizing resume");
  });
});
