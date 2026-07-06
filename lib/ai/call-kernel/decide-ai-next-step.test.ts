import { describe, expect, it } from "vitest";
import {
  applyAiCallDecision,
  decideAiNextStep,
} from "@/lib/ai/call-kernel/decide-ai-next-step";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  OPENROUTER_FREE_SLOT,
} from "@/src/lib/ai/engine/pool-constants";
import type { AiCallTarget } from "@/lib/ai/call-kernel/types";

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

const deepSeekTarget: AiCallTarget = {
  executor: "system_pool",
  routeMode: "system",
  slot: DEEPSEEK_OVERFLOW_SLOT,
  attemptOnTarget: 1,
};

describe("decideAiNextStep", () => {
  it("returns mission_success on parse-valid output", () => {
    expect(
      decideAiNextStep({
        target: customerTarget,
        classification: "success",
        systemAvailable: true,
      }),
    ).toEqual({ action: "mission_success" });
  });

  it("escalates BYOK auth failure to system slot 0", () => {
    expect(
      decideAiNextStep({
        target: customerTarget,
        classification: "auth",
        systemAvailable: true,
      }),
    ).toEqual({ action: "escalate_system", slot: OPENROUTER_FREE_SLOT });
  });

  it("fails BYOK auth when system unavailable", () => {
    const decision = decideAiNextStep({
      target: customerTarget,
      classification: "auth",
      systemAvailable: false,
    });
    expect(decision.action).toBe("mission_failed");
  });

  it("retries customer once on transient before escalating", () => {
    expect(
      decideAiNextStep({
        target: customerTarget,
        classification: "transient",
        systemAvailable: true,
      }),
    ).toEqual({ action: "retry_same" });

    expect(
      decideAiNextStep({
        target: { ...customerTarget, attemptOnTarget: 2 },
        classification: "transient",
        systemAvailable: true,
      }),
    ).toEqual({ action: "escalate_system", slot: OPENROUTER_FREE_SLOT });
  });

  it("escalates OpenRouter parse_failed to DeepSeek slot", () => {
    expect(
      decideAiNextStep({
        target: openRouterTarget,
        classification: "parse_failed",
        systemAvailable: true,
      }),
    ).toEqual({ action: "escalate_slot", slot: DEEPSEEK_OVERFLOW_SLOT });
  });

  it("escalates OpenRouter empty_response to DeepSeek after no retry path", () => {
    expect(
      decideAiNextStep({
        target: openRouterTarget,
        classification: "empty_response",
        systemAvailable: true,
      }),
    ).toEqual({ action: "escalate_slot", slot: DEEPSEEK_OVERFLOW_SLOT });
  });

  it("retries DeepSeek transient once then fails", () => {
    expect(
      decideAiNextStep({
        target: deepSeekTarget,
        classification: "transient",
        systemAvailable: true,
      }),
    ).toEqual({ action: "retry_same" });

    const failed = decideAiNextStep({
      target: { ...deepSeekTarget, attemptOnTarget: 2 },
      classification: "transient",
      systemAvailable: true,
    });
    expect(failed.action).toBe("mission_failed");
    if (failed.action === "mission_failed") {
      expect(failed.code).toBe("provider_error");
    }
  });

  it("fails DeepSeek parse_failed as parse_failed code", () => {
    const failed = decideAiNextStep({
      target: deepSeekTarget,
      classification: "parse_failed",
      systemAvailable: true,
    });
    expect(failed).toEqual({
      action: "mission_failed",
      code: "parse_failed",
      message: expect.stringContaining("parse_failed"),
    });
  });
});

describe("applyAiCallDecision", () => {
  it("increments attemptOnTarget on retry_same", () => {
    expect(
      applyAiCallDecision(customerTarget, { action: "retry_same" }),
    ).toEqual({ ...customerTarget, attemptOnTarget: 2 });
  });

  it("switches to system pool on escalate_system", () => {
    expect(
      applyAiCallDecision(customerTarget, {
        action: "escalate_system",
        slot: OPENROUTER_FREE_SLOT,
      }),
    ).toEqual({
      executor: "system_pool",
      routeMode: "system",
      slot: OPENROUTER_FREE_SLOT,
      attemptOnTarget: 1,
    });
  });
});
