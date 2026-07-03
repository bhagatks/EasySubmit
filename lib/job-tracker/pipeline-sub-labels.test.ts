import { describe, expect, it } from "vitest";
import {
  APPLY_PIPELINE_USER_LINES,
  resolvePipelineSubLabel,
} from "@/lib/job-tracker/pipeline-sub-labels";

describe("resolvePipelineSubLabel", () => {
  it("returns catalog lines for pipeline stages", () => {
    expect(resolvePipelineSubLabel({ status: "CAPTURED" })).toBe(
      APPLY_PIPELINE_USER_LINES.optimizingResume,
    );
    expect(resolvePipelineSubLabel({ status: "READY_TO_APPLY" })).toBe(
      APPLY_PIPELINE_USER_LINES.readyToApply,
    );
    expect(resolvePipelineSubLabel({ status: "APPLIED" })).toBe(
      APPLY_PIPELINE_USER_LINES.applied,
    );
  });
});
