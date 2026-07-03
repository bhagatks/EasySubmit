import { describe, expect, it, afterEach } from "vitest";
import { buildApplyPipelineStepProperties } from "@/src/shared/analytics/apply-pipeline-step";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";
import { isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";
import {
  emptyPipelineDebugProgress,
  parsePipelineDebugProgress,
  PIPELINE_DEBUG_STEP_DEFS,
} from "@/src/shared/extension/pipeline-debug-types";

describe("pipeline debug types", () => {
  it("defines the extension apply step catalog", () => {
    expect(PIPELINE_DEBUG_STEP_DEFS.length).toBeGreaterThanOrEqual(18);
    expect(PIPELINE_DEBUG_STEP_DEFS.some((s) => s.id === "ai_gates")).toBe(true);
    expect(PIPELINE_DEBUG_STEP_DEFS.some((s) => s.id === "ai_pass2")).toBe(true);
  });

  it("empty progress seeds all steps pending", () => {
    const progress = emptyPipelineDebugProgress("trace-1");
    expect(progress.steps).toHaveLength(PIPELINE_DEBUG_STEP_DEFS.length);
    expect(progress.steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("parsePipelineDebugProgress rejects invalid payloads", () => {
    expect(parsePipelineDebugProgress(null)).toBeNull();
    expect(parsePipelineDebugProgress({ traceId: "x" })).toBeNull();
    expect(parsePipelineDebugProgress([])).toBeNull();
  });

  it("parsePipelineDebugProgress accepts stored progress payloads", () => {
    const progress = emptyPipelineDebugProgress("trace-1");
    expect(parsePipelineDebugProgress(progress)?.traceId).toBe("trace-1");
  });
});

describe("apply pipeline step analytics payload", () => {
  it("includes step id, status, group, and sanitized meta", () => {
    const props = buildApplyPipelineStepProperties({
      userId: "user-1",
      entryId: "job-1",
      traceId: "trace-1",
      stepId: "ai_gates",
      status: "done",
      detail: "AI allowed",
      meta: {
        routeMode: "customer",
        modelId: "gemini-2.5-flash",
        email: "should-strip@example.com",
      },
    });

    expect(props.surface).toBe("extension");
    expect(props.step_id).toBe("ai_gates");
    expect(props.step_status).toBe("done");
    expect(props.step_group).toBe("AI gates");
    expect(props.entry_id).toBe("job-1");
    expect(props.trace_id).toBe("trace-1");
    expect(props.step_meta).toEqual({
      routeMode: "customer",
      modelId: "gemini-2.5-flash",
    });
  });

  it("falls back for unknown step ids and trims empty detail", () => {
    const props = buildApplyPipelineStepProperties({
      stepId: "unknown_step",
      status: "active",
      detail: "   ",
      meta: {},
    });
    expect(props.step_label).toBe("unknown_step");
    expect(props.step_group).toBeUndefined();
    expect(props.detail).toBeUndefined();
    expect(props.step_meta).toBeUndefined();
  });
});

describe("pipeline debug gate", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("is disabled under vitest (NODE_ENV=test)", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
    expect(isPipelineDebugEnabled()).toBe(false);
  });

  it("isDevAnalyticsEnvironment tracks prod vs dev", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
    expect(isDevAnalyticsEnvironment()).toBe(true);

    process.env.NEXT_PUBLIC_ANALYTICS_ENV = "prod";
    expect(isDevAnalyticsEnvironment()).toBe(false);
  });
});
