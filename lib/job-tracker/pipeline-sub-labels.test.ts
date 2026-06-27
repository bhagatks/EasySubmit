import { describe, expect, it } from "vitest";
import {
  PIPELINE_SUB_LABELS,
  resolvePipelineSubLabel,
} from "@/lib/job-tracker/pipeline-sub-labels";

describe("resolvePipelineSubLabel", () => {
  it("returns the canonical sub-label for each pipeline stage", () => {
    expect(
      resolvePipelineSubLabel({ status: "CAPTURED" }),
    ).toBe(PIPELINE_SUB_LABELS.optimizingResume);
    expect(
      resolvePipelineSubLabel({ status: "RESUME_READY" }),
    ).toBe(PIPELINE_SUB_LABELS.resumeReadyReview);
    expect(
      resolvePipelineSubLabel({ status: "READY_TO_APPLY", extensionInstalled: true }),
    ).toBe(PIPELINE_SUB_LABELS.applyAssistActive);
    expect(
      resolvePipelineSubLabel({ status: "READY_TO_APPLY", extensionInstalled: false }),
    ).toBe(PIPELINE_SUB_LABELS.readyToApply);
    expect(
      resolvePipelineSubLabel({ status: "APPLIED", appliedSource: "dashboard_manual" }),
    ).toBe(PIPELINE_SUB_LABELS.applied);
    expect(
      resolvePipelineSubLabel({ status: "APPLIED", appliedSource: "extension_auto" }),
    ).toBe(PIPELINE_SUB_LABELS.appliedViaAssist);
    expect(
      resolvePipelineSubLabel({ status: "APPLIED", appliedSource: "extension_manual" }),
    ).toBe(PIPELINE_SUB_LABELS.appliedViaAssist);
  });

  it("surfaces pipeline errors", () => {
    expect(
      resolvePipelineSubLabel({ status: "CAPTURED", hasError: true }),
    ).toBe("Something went wrong");
  });
});
