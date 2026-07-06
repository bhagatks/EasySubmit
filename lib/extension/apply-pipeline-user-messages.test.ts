import { describe, expect, it } from "vitest";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import {
  APPLY_PIPELINE_FAILURE_LINES,
  APPLY_PIPELINE_USER_LINES,
  applyPipelineStageLabelFromTrackerStage,
  formatApplyPipelineDevDetail,
  resolveApplyPipelineUserMessage,
} from "@/src/shared/extension/apply-pipeline-user-messages";

describe("resolveApplyPipelineUserMessage", () => {
  it("shows Job capturing while capture steps are running", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "capture_validate"
          ? { ...step, status: "active" as const }
          : step,
      ),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "CAPTURED",
        progress,
      }),
    ).toEqual({
      line: APPLY_PIPELINE_USER_LINES.jobCapturing,
      kind: "progress",
      stageId: "job_info",
    });
  });

  it("shows Optimizing resume during resume prep", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "capture_validate" || step.id === "capture_save") {
          return { ...step, status: "done" as const };
        }
        if (step.id === "ai_pass1") {
          return { ...step, status: "active" as const };
        }
        return step;
      }),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "CAPTURED",
        progress,
      }).line,
    ).toBe(APPLY_PIPELINE_USER_LINES.optimizingResume);
  });

  it("maps ai_pass1 failure to Resume optimization failed", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const progress = {
      ...base,
      steps: base.steps.map((step) =>
        step.id === "ai_pass1"
          ? { ...step, status: "error" as const, detail: "Provider timeout" }
          : { ...step, status: "done" as const },
      ),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "READY_TO_APPLY",
        progress,
        metadata: { pipelineError: "AI enhancement failed" },
        stepFailure: {
          stepId: "ai_pass1",
          label: "Max-ATS AI pass",
          detail: "Provider timeout",
          stage: "resume_prep",
          stageTitle: "Resume prepared",
        },
      }),
    ).toMatchObject({
      line: APPLY_PIPELINE_FAILURE_LINES.resumeOptimizationFailed,
      kind: "error",
      stageId: "optimized_resume",
    });
  });

  it("maps capture gap to warning copy", () => {
    expect(
      resolveApplyPipelineUserMessage({
        status: "READY_TO_APPLY",
        progress: emptyPipelineDebugProgress("trace-1"),
        issueMessage: "Capture gap: Company",
      }),
    ).toMatchObject({
      line: APPLY_PIPELINE_FAILURE_LINES.captureGapReview,
      kind: "warning",
    });
  });

  it("shows Applied for applied statuses", () => {
    expect(
      resolveApplyPipelineUserMessage({
        status: "APPLIED",
        progress: null,
      }),
    ).toMatchObject({
      line: APPLY_PIPELINE_USER_LINES.applied,
      kind: "success",
      stageId: "applied",
    });
  });
});

describe("applyPipelineStageLabelFromTrackerStage", () => {
  it("uses fixed customer segment titles", () => {
    expect(applyPipelineStageLabelFromTrackerStage("capture")).toBe("Job info");
    expect(applyPipelineStageLabelFromTrackerStage("resume_prep")).toBe("Optimized resume");
    expect(applyPipelineStageLabelFromTrackerStage("ready")).toBe("Auto Suggest");
  });
});

describe("formatApplyPipelineDevDetail", () => {
  it("keeps raw step detail for QA", () => {
    expect(
      formatApplyPipelineDevDetail({
        stepFailure: {
          stepId: "ai_pass1",
          label: "Max-ATS AI pass",
          detail: "Provider timeout",
          stage: "resume_prep",
          stageTitle: "Resume prepared",
        },
      }),
    ).toBe("Max-ATS AI pass — Provider timeout");
  });

  it("shows specific ai_pass1 warning detail when resume prep completed", () => {
    const base = emptyPipelineDebugProgress("trace-1");
    const specific =
      "EasySubmit AI is at capacity today. We saved rule-based improvements — add your API key in AI Keys for full AI.";
    const progress = {
      ...base,
      steps: base.steps.map((step) => {
        if (step.id === "ai_pass1") {
          return {
            ...step,
            status: "warning" as const,
            detail: specific,
          };
        }
        if (step.id === "persist_overrides") {
          return { ...step, status: "done" as const };
        }
        return step;
      }),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "RESUME_READY",
        progress,
      }),
    ).toMatchObject({
      line: specific,
      kind: "warning",
      stageId: "optimized_resume",
    });
  });

  it("shows fallback warning when ai_pass1 warns but resume prep completed", () => {
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
        if (step.id === "persist_overrides") {
          return { ...step, status: "done" as const };
        }
        return step;
      }),
    };

    expect(
      resolveApplyPipelineUserMessage({
        status: "RESUME_READY",
        progress,
      }),
    ).toMatchObject({
      line: "AI unavailable — full deterministic baseline applied",
      kind: "warning",
      stageId: "optimized_resume",
    });
  });
});
