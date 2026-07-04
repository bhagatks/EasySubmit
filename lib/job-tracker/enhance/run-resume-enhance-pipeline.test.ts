import { describe, expect, it } from "vitest";
import { resolveDeterministicFallbackWarning } from "@/lib/job-tracker/enhance/max-ats-helpers";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import { resolveApplyPipelineUserMessage } from "@/src/shared/extension/apply-pipeline-user-messages";

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
        return { ...step, status: "done" as const };
      }),
    };

    const message = resolveApplyPipelineUserMessage({
      status: "READY_TO_APPLY",
      progress,
    });
    expect(message.kind).not.toBe("error");
    expect(message.line).toMatch(/ready to apply|rule-based fallback/i);
  });
});
