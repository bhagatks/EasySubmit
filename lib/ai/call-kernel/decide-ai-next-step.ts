import {
  DEEPSEEK_OVERFLOW_SLOT,
  OPENROUTER_FREE_SLOT,
} from "@/src/lib/ai/engine/pool-constants";
import type {
  AiCallClassification,
  AiCallDecisionAction,
  AiCallTarget,
} from "@/lib/ai/call-kernel/types";

export type AiCallDecision =
  | { action: "mission_success" }
  | { action: "retry_same" }
  | { action: "escalate_system"; slot: number }
  | { action: "escalate_slot"; slot: number }
  | { action: "mission_failed"; code: string; message: string };

const MAX_ATTEMPTS_PER_TARGET = 2;

export function decideAiNextStep(input: {
  target: AiCallTarget;
  classification: AiCallClassification;
  systemAvailable: boolean;
}): AiCallDecision {
  const { target, classification, systemAvailable } = input;

  if (classification === "success") {
    return { action: "mission_success" };
  }

  if (classification === "auth" && target.routeMode === "customer") {
    if (systemAvailable) {
      return { action: "escalate_system", slot: OPENROUTER_FREE_SLOT };
    }
    return {
      action: "mission_failed",
      code: "provider_error",
      message: "API key was rejected and system AI is unavailable.",
    };
  }

  if (
    (classification === "transient" || classification === "rate_limited") &&
    target.attemptOnTarget < MAX_ATTEMPTS_PER_TARGET
  ) {
    return { action: "retry_same" };
  }

  if (target.routeMode === "customer") {
    if (systemAvailable) {
      return { action: "escalate_system", slot: OPENROUTER_FREE_SLOT };
    }
    return {
      action: "mission_failed",
      code: "provider_error",
      message: "Customer AI failed and system fallback is unavailable.",
    };
  }

  const onOpenRouterSlot =
    target.slot === OPENROUTER_FREE_SLOT || target.slot === undefined;

  if (
    onOpenRouterSlot &&
    systemAvailable &&
    (classification === "parse_failed" ||
      classification === "empty_response" ||
      classification === "provider_error" ||
      classification === "transient" ||
      classification === "rate_limited" ||
      classification === "capacity_exhausted" ||
      classification === "quota_exhausted")
  ) {
    if (
      (classification === "transient" || classification === "rate_limited") &&
      target.attemptOnTarget < MAX_ATTEMPTS_PER_TARGET
    ) {
      return { action: "retry_same" };
    }
    return { action: "escalate_slot", slot: DEEPSEEK_OVERFLOW_SLOT };
  }

  if (
    target.slot === DEEPSEEK_OVERFLOW_SLOT &&
    (classification === "transient" || classification === "rate_limited") &&
    target.attemptOnTarget < MAX_ATTEMPTS_PER_TARGET
  ) {
    return { action: "retry_same" };
  }

  const code =
    classification === "parse_failed"
      ? "parse_failed"
      : classification === "empty_response"
        ? "invalid_response"
        : classification === "capacity_exhausted"
          ? "capacity_exhausted"
          : classification === "quota_exhausted"
            ? "insufficient_quota"
            : classification === "rate_limited"
              ? "rate_limited"
              : "provider_error";

  return {
    action: "mission_failed",
    code,
    message: `AI call failed after ${target.executor} slot ${target.slot ?? "—"} (${classification}).`,
  };
}

export function applyAiCallDecision(
  target: AiCallTarget,
  decision: Exclude<AiCallDecision, { action: "mission_success" | "mission_failed" }>,
): AiCallTarget {
  if (decision.action === "retry_same") {
    return { ...target, attemptOnTarget: target.attemptOnTarget + 1 };
  }

  if (decision.action === "escalate_system") {
    return {
      executor: "system_pool",
      routeMode: "system",
      slot: decision.slot,
      attemptOnTarget: 1,
    };
  }

  return {
    executor: "system_pool",
    routeMode: "system",
    slot: decision.slot,
    attemptOnTarget: 1,
  };
}

export function decisionActionLabel(decision: AiCallDecision): AiCallDecisionAction {
  return decision.action;
}
