import { describe, expect, it } from "vitest";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  findPipelineStageInconsistency,
  findPipelineStepFailure,
  pipelineStepsForTrackerStage,
  resolveTrackerPipelineView,
} from "@/lib/job-tracker/pipeline-tracker-view";

describe("pipeline tracker stage mapping", () => {
  it("maps capture steps to stage 1", () => {
    expect(pipelineStepsForTrackerStage("capture")).toEqual([
      "capture_validate",
      "capture_save",
    ]);
  });

  it("maps resume prep steps to stage 2", () => {
    const steps = pipelineStepsForTrackerStage("resume_prep");
    expect(steps).toContain("profile_load");
    expect(steps).toContain("persist_overrides");
    expect(steps).not.toContain("capture_validate");
  });
});

describe("findPipelineStepFailure", () => {
  it("returns the first error step in order", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "pre_onet") {
          return { ...step, status: "error" as const, detail: "O*NET failed" };
        }
        if (step.id === "ai_pass1") {
          return { ...step, status: "error" as const, detail: "AI failed" };
        }
        return step;
      }),
    };

    expect(findPipelineStepFailure(progress)).toMatchObject({
      stepId: "pre_onet",
      stage: "resume_prep",
      detail: "O*NET failed",
    });
  });

  it("ignores warning steps — optional degradation does not fail the pipeline", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "pre_onet") {
          return {
            ...step,
            status: "warning" as const,
            detail: "O*NET auth failed (401) — credentials required",
          };
        }
        if (step.id === "status_ready") {
          return { ...step, status: "done" as const };
        }
        return step;
      }),
    };

    expect(findPipelineStepFailure(progress)).toBeNull();
  });
});

describe("findPipelineStageInconsistency", () => {
  it("flags READY_TO_APPLY when resume prep steps never finished", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "status_ready") {
          return { ...step, status: "done" as const, detail: "READY_TO_APPLY" };
        }
        if (step.id === "capture_validate" || step.id === "capture_save") {
          return { ...step, status: "done" as const };
        }
        if (step.id === "pre_validate") {
          return { ...step, status: "pending" as const };
        }
        return step;
      }),
    };

    expect(findPipelineStageInconsistency(progress, "READY_TO_APPLY")).toMatchObject({
      stepId: "profile_load",
      stage: "resume_prep",
    });
  });
});

describe("resolveTrackerPipelineView", () => {
  it("pins the bar to stage 2 when a resume prep step failed", () => {
    const view = resolveTrackerPipelineView({
      status: "READY_TO_APPLY",
      stepFailure: {
        stepId: "pre_onet",
        label: "Vocabulary",
        detail: "Provider timeout",
        stage: "resume_prep",
        stageTitle: "Resume prepared",
      },
    });

    expect(view.hasPipelineFailure).toBe(true);
    expect(view.progress).toEqual({ filledThrough: 1, currentIndex: 2, isComplete: false });
    expect(view.subLabel).toBe("Resume optimization failed.");
  });
});
