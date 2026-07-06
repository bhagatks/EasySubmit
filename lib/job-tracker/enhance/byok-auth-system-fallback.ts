import { isEnhanceAuthFailure } from "@/lib/ai/enhance-failure-messages";
import {
  DEEPSEEK_OVERFLOW_SLOT,
  OPENROUTER_FREE_SLOT,
} from "@/src/lib/ai/engine/pool-constants";

/** True when a customer-route enhance failed due to BYOK auth — eligible for system retry. */
export function shouldRetryEnhanceWithSystemPool(input: {
  routeMode: "customer" | "system";
  code?: string | null;
  error?: string;
}): boolean {
  if (input.routeMode !== "customer") return false;
  return isEnhanceAuthFailure(input.code, input.error);
}

/** True when system slot 0 returned HTTP success but resume JSON did not parse — retry slot 1. */
export function shouldRetrySystemPoolOnParseFail(input: {
  routeMode: "customer" | "system";
  failedSlot?: number | null;
  priorFailoverAttempt?: boolean;
}): boolean {
  if (input.routeMode !== "system") return false;
  if (input.priorFailoverAttempt) return false;
  return input.failedSlot === OPENROUTER_FREE_SLOT;
}

export function systemPoolParseFailoverSlot(failedSlot: number): number | null {
  if (failedSlot === OPENROUTER_FREE_SLOT) return DEEPSEEK_OVERFLOW_SLOT;
  return null;
}
