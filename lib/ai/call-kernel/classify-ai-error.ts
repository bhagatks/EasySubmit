import { isEnhanceAuthFailure } from "@/lib/ai/enhance-failure-messages";
import {
  mapEnhanceProviderError,
  type EnhanceProviderErrorCode,
} from "@/src/lib/ai/engine/map-enhance-provider-error";
import { SystemKeyPoolError } from "@/src/lib/ai/engine/system-key-pool";
import type { AiCallClassification } from "@/lib/ai/call-kernel/types";

export type ClassifiedAiError = {
  classification: AiCallClassification;
  code: EnhanceProviderErrorCode | "capacity_exhausted" | "system_pool_exhausted";
  message: string;
  retryAfterSec?: number;
};

function isTransientMessage(message: string): boolean {
  return /overloaded|503|service unavailable|high demand|temporarily unavailable|timeout|ETIMEDOUT|aborted/i.test(
    message,
  );
}

export function classifyAiError(
  err: unknown,
  routeMode: "customer" | "system",
): ClassifiedAiError {
  if (err instanceof SystemKeyPoolError) {
    if (err.code === "capacity_exhausted") {
      return {
        classification: "capacity_exhausted",
        code: "capacity_exhausted",
        message: err.message,
      };
    }
    return {
      classification: "provider_error",
      code: "provider_error",
      message: err.message,
    };
  }

  const mapped = mapEnhanceProviderError(err, { aiMode: routeMode });
  const message = mapped.rawMessage || mapped.userMessage;

  if (mapped.code === "rate_limited") {
    return {
      classification: "rate_limited",
      code: mapped.code,
      message: mapped.userMessage,
      retryAfterSec: mapped.retryAfterSec,
    };
  }

  if (mapped.code === "insufficient_quota") {
    return {
      classification: "quota_exhausted",
      code: mapped.code,
      message: mapped.userMessage,
      retryAfterSec: mapped.retryAfterSec,
    };
  }

  if (isEnhanceAuthFailure(mapped.code, message)) {
    return {
      classification: "auth",
      code: mapped.code,
      message: mapped.userMessage,
    };
  }

  if (mapped.code === "invalid_response") {
    return {
      classification: "empty_response",
      code: mapped.code,
      message: mapped.userMessage,
    };
  }

  if (isTransientMessage(message)) {
    return {
      classification: "transient",
      code: mapped.code,
      message: mapped.userMessage,
      retryAfterSec: mapped.retryAfterSec,
    };
  }

  if (/safety|blocked|harm|content.?filter|prohibited|responsible ai/i.test(message)) {
    return {
      classification: "permanent",
      code: mapped.code,
      message: mapped.userMessage,
    };
  }

  return {
    classification: "provider_error",
    code: mapped.code,
    message: mapped.userMessage,
    retryAfterSec: mapped.retryAfterSec,
  };
}

export function classificationToBlockCode(
  classification: AiCallClassification,
  providerCode?: string,
): string {
  if (classification === "parse_failed" || classification === "empty_response") {
    return classification === "parse_failed" ? "parse_failed" : "invalid_response";
  }
  if (classification === "capacity_exhausted") return "capacity_exhausted";
  if (classification === "quota_exhausted") return "insufficient_quota";
  if (classification === "rate_limited") return "rate_limited";
  if (classification === "auth") return "provider_error";
  return providerCode ?? "provider_error";
}
