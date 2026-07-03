import { describe, expect, it } from "vitest";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  alignPipelineDebugWithJobTruth,
  refreshPipelineDebugLabelsForDisplay,
  resolvePipelineDebugProgressForDisplay,
} from "@/lib/extension/pipeline-debug-display";

describe("alignPipelineDebugWithJobTruth", () => {
  it("marks ai_pass1 error from metadata when steps were falsely healed green", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => ({
        ...step,
        status: "done" as const,
        detail: "Completed",
      })),
    };

    const aligned = alignPipelineDebugWithJobTruth(progress, {
      pipelineError: "AI enhancement failed. Try again.",
    }, "READY_TO_APPLY");

    expect(aligned.steps.find((step) => step.id === "ai_pass1")?.status).toBe("error");
    expect(aligned.steps.find((step) => step.id === "status_ready")?.status).toBe("error");
  });
});

describe("resolvePipelineDebugProgressForDisplay", () => {
  it("does not finalize when metadata records a pipeline error", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "status_ready"
          ? { ...step, status: "done" as const, detail: "READY_TO_APPLY" }
          : { ...step, status: "done" as const },
      ),
    };

    const resolved = resolvePipelineDebugProgressForDisplay(
      progress,
      { pipelineError: "AI enhancement failed" },
      "READY_TO_APPLY",
    );

    expect(resolved.steps.find((step) => step.id === "ai_pass1")?.status).toBe("error");
    expect(resolved.steps.every((step) => step.status === "done")).toBe(false);
  });
});

describe("refreshPipelineDebugLabelsForDisplay", () => {
  it("replaces legacy O*NET copy with Vocabulary for stored pre_onet rows", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "pre_onet"
          ? {
              ...step,
              label: "O*NET vocabulary",
              status: "done" as const,
              detail: "Director, AI/ML and Data Architecture",
              artifacts: [
                {
                  kind: "output" as const,
                  label: "O*NET vocabulary",
                  payload: { matchedTitle: "Director, AI/ML and Data Architecture" },
                },
              ],
            }
          : step,
      ),
    };

    const refreshed = refreshPipelineDebugLabelsForDisplay(progress);
    const onet = refreshed.steps.find((step) => step.id === "pre_onet");
    expect(onet?.label).toBe("Vocabulary");
    expect(onet?.artifacts?.[0]?.label).toBe("Vocabulary");
  });
});
