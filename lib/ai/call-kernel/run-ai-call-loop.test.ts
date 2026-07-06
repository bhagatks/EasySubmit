import { describe, expect, it, vi } from "vitest";
import { runAiCallLoop } from "@/lib/ai/call-kernel/run-ai-call-loop";
import type { AiCallExecuteResult, AiCallTarget } from "@/lib/ai/call-kernel/types";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  OPENROUTER_FREE_SLOT,
} from "@/src/lib/ai/engine/pool-constants";

const VALID_RESUME = JSON.stringify({
  professionalSummary: "Experienced engineer.",
  skillsText: "TypeScript, React",
  experience: [],
});

function makeResult(overrides: Partial<AiCallExecuteResult> = {}): AiCallExecuteResult {
  return {
    text: VALID_RESUME,
    tokensUsed: 100,
    modelId: "test-model",
    estimatedCost: 0,
    durationMs: 50,
    ...overrides,
  };
}

const customerTarget: AiCallTarget = {
  executor: "customer",
  routeMode: "customer",
  attemptOnTarget: 1,
};

const openRouterTarget: AiCallTarget = {
  executor: "system_pool",
  routeMode: "system",
  slot: OPENROUTER_FREE_SLOT,
  attemptOnTarget: 1,
};

describe("runAiCallLoop", () => {
  it("succeeds on first customer attempt with one ledger entry", async () => {
    const execute = vi.fn(async () => makeResult({ modelId: "gpt-4o", provider: "openai" }));

    const result = await runAiCallLoop({
      traceId: "trace-1",
      initialTarget: customerTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(false);
    expect(result.text).toBe(VALID_RESUME);
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0]).toMatchObject({
      attempt: 1,
      executor: "customer",
      classification: "success",
      decision: "mission_success",
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("escalates customer auth error to system slot 0 then succeeds", async () => {
    const execute = vi.fn(async (target: AiCallTarget) => {
      if (target.routeMode === "customer") {
        throw Object.assign(new Error("Invalid API key"), { status: 401 });
      }
      return makeResult({
        modelId: "openrouter/free",
        provider: "openrouter",
        slot: OPENROUTER_FREE_SLOT,
      });
    });

    const result = await runAiCallLoop({
      traceId: "trace-auth",
      initialTarget: customerTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(false);
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[0]).toMatchObject({
      attempt: 1,
      executor: "customer",
      classification: "auth",
      decision: "escalate_system",
    });
    expect(result.ledger[1]).toMatchObject({
      attempt: 2,
      executor: "system_pool",
      slot: OPENROUTER_FREE_SLOT,
      classification: "success",
      decision: "mission_success",
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("retries customer transient once then succeeds", async () => {
    let customerCalls = 0;
    const execute = vi.fn(async (target: AiCallTarget) => {
      if (target.routeMode === "customer") {
        customerCalls += 1;
        if (customerCalls === 1) {
          throw new Error("Service unavailable — model overloaded");
        }
      }
      return makeResult({ modelId: "gpt-4o", provider: "openai" });
    });

    const result = await runAiCallLoop({
      traceId: "trace-transient",
      initialTarget: customerTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(false);
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[0]).toMatchObject({
      classification: "transient",
      decision: "retry_same",
    });
    expect(result.ledger[1]).toMatchObject({
      classification: "success",
      decision: "mission_success",
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("escalates OpenRouter parse_failed to DeepSeek then succeeds (Run 2 prod bug)", async () => {
    const execute = vi.fn(async (target: AiCallTarget) => {
      if (target.slot === OPENROUTER_FREE_SLOT) {
        return makeResult({
          text: "not valid resume json",
          modelId: "openrouter/free",
          provider: "openrouter",
          slot: OPENROUTER_FREE_SLOT,
        });
      }
      return makeResult({
        modelId: "deepseek-v4-flash",
        provider: "deepseek",
        slot: DEEPSEEK_OVERFLOW_SLOT,
      });
    });

    const result = await runAiCallLoop({
      traceId: "trace-parse-escalate",
      initialTarget: openRouterTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(false);
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[0]).toMatchObject({
      attempt: 1,
      slot: OPENROUTER_FREE_SLOT,
      classification: "parse_failed",
      decision: "escalate_slot",
    });
    expect(result.ledger[1]).toMatchObject({
      attempt: 2,
      slot: DEEPSEEK_OVERFLOW_SLOT,
      classification: "success",
      decision: "mission_success",
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("fails mission when DeepSeek slot fails with full ledger", async () => {
    const execute = vi.fn(async (target: AiCallTarget) => {
      if (target.slot === OPENROUTER_FREE_SLOT) {
        return makeResult({
          text: "{broken json",
          modelId: "openrouter/free",
          slot: OPENROUTER_FREE_SLOT,
        });
      }
      return makeResult({
        text: "still not json",
        modelId: "deepseek-v4-flash",
        slot: DEEPSEEK_OVERFLOW_SLOT,
      });
    });

    const result = await runAiCallLoop({
      traceId: "trace-deepseek-fail",
      initialTarget: openRouterTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(true);
    expect(result.failureCode).toBe("parse_failed");
    expect(result.failureMessage).toContain("parse_failed");
    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[1]).toMatchObject({
      slot: DEEPSEEK_OVERFLOW_SLOT,
      classification: "parse_failed",
      decision: "mission_failed",
    });
  });

  it("fires onValidatedSuccess only after parse validation passes", async () => {
    const onValidatedSuccess = vi.fn();

    await runAiCallLoop({
      traceId: "trace-callback-fail",
      initialTarget: openRouterTarget,
      systemAvailable: true,
      execute: async () =>
        makeResult({
          text: "unparseable",
          modelId: "openrouter/free",
          slot: OPENROUTER_FREE_SLOT,
        }),
      onValidatedSuccess,
    });
    expect(onValidatedSuccess).not.toHaveBeenCalled();

    onValidatedSuccess.mockClear();

    await runAiCallLoop({
      traceId: "trace-callback-ok",
      initialTarget: customerTarget,
      systemAvailable: true,
      execute: async () => makeResult({ modelId: "gpt-4o" }),
      onValidatedSuccess,
    });
    expect(onValidatedSuccess).toHaveBeenCalledTimes(1);
    expect(onValidatedSuccess.mock.calls[0]?.[0]).toMatchObject({
      entry: expect.objectContaining({ classification: "success", decision: "mission_success" }),
    });
  });

  it("terminates within MAX_LOOP_ITERATIONS when errors keep retrying", async () => {
    const execute = vi.fn(async () => {
      throw new Error("Service unavailable — model overloaded");
    });

    const result = await runAiCallLoop({
      traceId: "trace-max-iter",
      initialTarget: customerTarget,
      systemAvailable: true,
      execute,
    });

    expect(result.missionFailed).toBe(true);
    expect(result.ledger.length).toBeLessThanOrEqual(8);
    expect(execute.mock.calls.length).toBe(result.ledger.length);
    expect(result.ledger.length).toBeGreaterThan(1);
  });
});
