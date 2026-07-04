import { describe, expect, it } from "vitest";
import { emptyPipelineDebugProgress } from "@/src/shared/extension/pipeline-debug-types";
import { buildPipelineRunView } from "@/src/shared/extension/pipeline-run-view";

describe("buildPipelineRunView", () => {
  it("builds SRE overview from pipeline steps and api logs", () => {
    const progress = emptyPipelineDebugProgress("trace-abc");
    const steps = progress.steps.map((step) => {
      if (
        ["pre_intelligence", "pre_keyword_gap", "pre_directive", "pre_plan"].includes(step.id)
      ) {
        return {
          ...step,
          status: "skipped" as const,
          detail: "Light path — deferred to AI-fail fallback",
        };
      }
      if (step.id === "ai_jd_extract") {
        return {
          ...step,
          status: "skipped" as const,
          detail: "AI JD extract disabled (ai_jd_extract_enabled)",
          startedAt: progress.startedAt,
          finishedAt: progress.startedAt,
        };
      }
      if (step.id === "ai_pass1") {
        return {
          ...step,
          status: "done" as const,
          detail: "Max-ATS complete — claude-opus-4-5",
          meta: { modelId: "claude-opus-4-5", tokensUsed: 4000 },
          startedAt: progress.startedAt,
          finishedAt: new Date(Date.parse(progress.startedAt) + 14_000).toISOString(),
        };
      }
      if (step.id === "persist_overrides") {
        return {
          ...step,
          status: "done" as const,
          detail: "Changed: skills, professionalSummary",
          startedAt: progress.startedAt,
          finishedAt: progress.startedAt,
        };
      }
      return step;
    });

    const view = buildPipelineRunView({
      progress: { ...progress, steps },
      context: {
        jobId: "job-1",
        title: "Director",
        company: "Fidelity",
        platform: "workday",
        status: "READY_TO_APPLY",
        savedAt: progress.startedAt,
        traceId: "trace-abc",
        enhanceMeta: {
          aiAttempted: true,
          aiSucceeded: true,
          engineMode: "ai",
          readinessDelta: { before: 0, after: 71 },
        },
        jdSource: "deterministic",
        jdConfidence: 0.4,
        jdMustHaveSkills: 0,
        vocabSkills: 22,
        vocabSource: "api",
      },
      apiLogs: [
        {
          id: "log-1",
          traceId: "trace-abc",
          createdAt: progress.startedAt,
          operation: "ai.enhance.generate_text",
          status: "success",
          provider: "anthropic",
          modelId: "claude-opus-4-5",
          durationMs: 14000,
          tokensUsed: 4000,
          errorCode: null,
          errorMessage: null,
          aiMode: "customer",
          metadata: null,
        },
      ],
    });

    expect(view.overview.apiCallCount).toBe(1);
    expect(view.overview.totalTokens).toBe(4000);
    expect(view.overview.readinessAfter).toBe(71);
    expect(view.phases.some((p) => p.id === "fallback")).toBe(false);

    const jdStep = view.phases
      .flatMap((p) => p.steps)
      .find((s) => s.id === "ai_jd_extract");
    expect(jdStep?.headline).toContain("feature flag OFF");
    expect(jdStep?.decisions.some((d) => d.label === "ai_jd_extract_enabled")).toBe(true);

    const persist = view.phases
      .flatMap((p) => p.steps)
      .find((s) => s.id === "persist_overrides");
    expect(persist?.changes).toEqual(["skills", "professionalSummary"]);
  });
});
