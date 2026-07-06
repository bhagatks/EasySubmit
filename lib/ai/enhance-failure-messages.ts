import type { EnhanceOffReason } from "@/lib/features/types";
import {
  formatSystemPoolExhaustedMessage,
  type EnhanceRouteError,
} from "@/lib/ai/system-pool-messages";

export {
  SYSTEM_POOL_EXHAUSTED_BYOK_BODY,
  SYSTEM_POOL_EXHAUSTED_HEADLINE,
  SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY,
  formatSystemPoolExhaustedMessage,
} from "@/lib/ai/system-pool-messages";

export type EnhanceFailureDisplayInput = {
  code?: string | null;
  reason?: EnhanceOffReason;
  routeError?: EnhanceRouteError;
  quotaMessage?: string;
  routeMode?: "customer" | "system";
  byokAvailable?: boolean;
  /** Operator-only detail — never shown when `code` maps to user copy. */
  error?: string;
};

function poolBlockedMessage(byokAvailable?: boolean): string {
  return formatSystemPoolExhaustedMessage(Boolean(byokAvailable));
}

/** Short headline for dashboard / extension dialogs. */
export function resolveEnhanceWarningTitle(input: {
  code?: string | null;
  reason?: EnhanceOffReason;
}): string {
  const key = input.code ?? input.reason;
  switch (key) {
    case "capacity_exhausted":
    case "system_pool_exhausted":
    case "pool_down":
      return "EasySubmit AI unavailable";
    case "rate_limited":
      return "AI rate limit reached";
    case "insufficient_quota":
    case "quota_exceeded":
    case "quota_enhancement":
    case "quota_calls":
      return "Daily AI limit reached";
    case "no_customer_key":
    case "no_system_key":
    case "no_key":
      return "API key needed";
    case "provider_error":
      return "AI enhance incomplete";
    default:
      return "Resume saved with rule-based edits";
  }
}

/** User copy when AI is blocked before any model call (baseline still runs). */
export function resolveEnhanceBlockedMessage(input: EnhanceFailureDisplayInput): string {
  if (input.reason === "quota_exceeded" && input.quotaMessage?.trim()) {
    return `${input.quotaMessage.trim()} Baseline improvements were still applied.`;
  }

  if (input.routeError && "error" in input.routeError) {
    if (input.routeError.error === "system_pool_exhausted") {
      return `${poolBlockedMessage(input.routeError.byokAvailable)} Baseline improvements were still applied.`;
    }
    if (input.routeError.error === "no_system_key") {
      return "EasySubmit AI is not configured. Add your API key in AI Keys — baseline improvements were still applied.";
    }
    if (input.routeError.error === "no_customer_key") {
      return "Add your API key in AI Keys to use AI — baseline improvements were still applied.";
    }
  }

  switch (input.reason) {
    case "globally_disabled":
      return "AI is off platform-wide. Baseline improvements were still applied.";
    case "feature_disabled":
      return "AI enhance is off for this flow. Baseline improvements were still applied.";
    case "user_disabled":
      return "AI is off in your Settings. Baseline improvements were still applied.";
    case "no_key":
      return "Add an API key in AI Keys for full AI — baseline improvements were still applied.";
    case "pool_down":
      return `${poolBlockedMessage(input.byokAvailable)} Baseline improvements were still applied.`;
    case "quota_exceeded":
      return "Daily AI limit reached. Baseline improvements were still applied.";
    default:
      return "AI upgrade skipped — baseline improvements were still applied.";
  }
}

/** User copy when AI was attempted but failed — deterministic resume still saved. */
export function resolveEnhanceAiRuntimeFallbackWarning(input: EnhanceFailureDisplayInput): string {
  const routeMode = input.routeMode ?? "system";
  const code = input.code ?? inferCodeFromError(input.error, routeMode);

  switch (code) {
    case "capacity_exhausted":
      return "EasySubmit AI is at capacity today. We saved rule-based improvements — add your API key in AI Keys for full AI.";
    case "rate_limited":
      return "AI is rate-limited right now. We saved rule-based improvements — wait a minute and try again.";
    case "insufficient_quota":
      return routeMode === "customer"
        ? "Your API key hit its provider limit. We saved rule-based improvements — check AI Keys or switch providers."
        : "EasySubmit AI hit its usage limit. We saved rule-based improvements — add your API key for unlimited access.";
    case "system_pool_exhausted":
      return `${poolBlockedMessage(input.byokAvailable)} We saved rule-based improvements to your resume.`;
    case "no_customer_key":
      return "Add your API key in AI Keys to use AI. We saved rule-based improvements to your resume.";
    case "no_system_key":
      return "EasySubmit AI is not configured. Add your API key in AI Keys — we saved rule-based improvements.";
    case "invalid_response":
      return "AI returned an empty response. We saved rule-based improvements — try again or switch AI source.";
    case "provider_error":
      if (isOverloadError(input.error)) {
        return "AI is busy right now. We saved rule-based improvements — try again in a minute.";
      }
      if (isAuthError(input.error)) {
        return routeMode === "customer"
          ? "Your API key was rejected. We saved rule-based improvements — update it in AI Keys."
          : "EasySubmit AI could not reach the provider. We saved rule-based improvements — try again later.";
      }
      return routeMode === "customer"
        ? "Your API key did not complete this enhance. We saved rule-based improvements — check AI Keys."
        : "EasySubmit AI could not finish this enhance. We saved rule-based improvements — try again or add your API key.";
    default:
      return "AI could not complete this enhance. We saved rule-based improvements to your resume.";
  }
}

function inferCodeFromError(error: string | undefined, routeMode: "customer" | "system"): string | null {
  const message = error?.trim() ?? "";
  if (!message) return null;
  if (/capacity|exhausted for today|daily capacity/i.test(message)) return "capacity_exhausted";
  if (/rate.?limit|too many requests|\b429\b/i.test(message)) return "rate_limited";
  if (/quota exceeded|insufficient.*quota|free_tier|spending cap/i.test(message)) {
    return "insufficient_quota";
  }
  if (/temporarily unavailable|pool_exhausted|shared ai/i.test(message)) {
    return "system_pool_exhausted";
  }
  if (/invalid.?key|unauthorized|401|api.?key was rejected/i.test(message)) {
    return routeMode === "customer" ? "no_customer_key" : "provider_error";
  }
  if (/overloaded|503|service unavailable|high demand/i.test(message)) return "provider_error";
  if (/empty response|no object generated|invalid json/i.test(message)) return "invalid_response";
  return null;
}

function isOverloadError(error: string | undefined): boolean {
  return /overloaded|503|service unavailable|high demand|temporarily unavailable/i.test(
    error ?? "",
  );
}

function isAuthError(error: string | undefined): boolean {
  return /invalid.?key|api.?key|unauthorized|401|permission denied|rejected/i.test(error ?? "");
}

/** Keep extension card status lines readable. */
export function truncateEnhanceUserMessage(message: string, maxLength = 140): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
