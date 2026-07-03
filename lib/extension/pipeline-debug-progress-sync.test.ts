import { describe, expect, it } from "vitest";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  finalizePipelineDebugProgress,
  reconcilePipelineDebugProgress,
} from "@/lib/extension/pipeline-debug-progress-sync";
import { resolvePipelineDebugProgressForDisplay } from "@/lib/extension/pipeline-debug-display";

describe("reconcilePipelineDebugProgress", () => {
  it("marks earlier pending steps done when a later step finished", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "pre_onet") return { ...step, status: "active" as const };
        if (step.id === "post_process") return { ...step, status: "done" as const, detail: "Done" };
        return step;
      }),
    };

    const reconciled = reconcilePipelineDebugProgress(progress);
    expect(reconciled.steps.find((step) => step.id === "pre_onet")?.status).toBe("done");
    expect(reconciled.steps.find((step) => step.id === "post_process")?.status).toBe("done");
  });
});

describe("finalizePipelineDebugProgress", () => {
  it("marks all remaining steps done when pipeline completes", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "status_ready"
          ? { ...step, status: "done" as const, detail: "READY_TO_APPLY" }
          : step,
      ),
    };

    const finalized = finalizePipelineDebugProgress(progress);
    expect(finalized.steps.every((step) => step.status === "done")).toBe(true);
  });

  it("does not heal over explicit error steps", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "status_ready") {
          return { ...step, status: "done" as const, detail: "READY_TO_APPLY" };
        }
        if (step.id === "pre_onet") {
          return { ...step, status: "error" as const, detail: "Failed" };
        }
        return step;
      }),
    };

    const finalized = finalizePipelineDebugProgress(progress);
    expect(finalized.steps.find((step) => step.id === "pre_onet")?.status).toBe("error");
    expect(finalized.steps.find((step) => step.id === "pre_validate")?.status).toBe("pending");
  });
});

describe("resolvePipelineDebugProgressForDisplay", () => {
  it("reconciles and finalizes when status_ready is done", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "status_ready") {
          return { ...step, status: "done" as const, detail: "READY_TO_APPLY" };
        }
        if (step.id === "pre_validate" || step.id === "pre_onet") {
          return { ...step, status: "pending" as const };
        }
        return step;
      }),
    };

    const resolved = resolvePipelineDebugProgressForDisplay(progress);
    expect(resolved.steps.every((step) => step.status === "done")).toBe(true);
  });
});
