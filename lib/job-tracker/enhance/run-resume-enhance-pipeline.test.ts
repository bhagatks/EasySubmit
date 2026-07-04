import { describe, expect, it } from "vitest";
import { resolveDeterministicFallbackWarning } from "@/lib/job-tracker/enhance/max-ats-helpers";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  APPLY_PIPELINE_USER_LINES,
  resolveApplyPipelineUserMessage,
} from "@/src/shared/extension/apply-pipeline-user-messages";

describe("max-ats helpers", () => {
  it("resolveDeterministicFallbackWarning returns user-friendly copy", () => {
    expect(resolveDeterministicFallbackWarning()).toMatch(/deterministic resume applied/i);
  });
});

describe("resolveApplyPipelineUserMessage ai fallback", () => {
  it("does not treat ai_pass1 warning as pipeline failure", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "ai_pass1") {
          return {
            ...step,
            status: "warning" as const,
            detail: "AI unavailable — full deterministic baseline applied",
          };
        }
        if (
          step.id === "capture_validate" ||
          step.id === "capture_save" ||
          step.id === "baseline" ||
          step.id === "post_process" ||
          step.id === "persist_overrides" ||
          step.id === "status_ready"
        ) {
          return { ...step, status: "done" as const };
        }
        return step;
      }),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "READY_TO_APPLY",
        progress,
      }).line,
    ).toBe(APPLY_PIPELINE_USER_LINES.readyToApply);
  });
});
