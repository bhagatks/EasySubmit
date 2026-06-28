import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import type { AiRouteResolution } from "@/src/lib/ai/engine/router";

export const BYOK_PIPELINE_FAILURE_CODES = [
  "no_customer_key",
  "provider_error",
  "vault_decrypt_failed",
  "invalid_api_key",
  "authentication_failed",
  "permission_denied",
  "api_key_invalid",
] as const;

export const BYOK_API_LOG_ERROR_CODES = [
  "vault_decrypt_failed",
  "provider_error",
  "invalid_api_key",
  "authentication_failed",
  "permission_denied",
  "api_key_invalid",
] as const;

export type ByokKeyBlockReason =
  | "missing_key"
  | "vault_unreadable"
  | "recent_api_failures"
  | "last_job_key_failure";

export type LastJobKeyFailure = {
  entryId: string;
  title: string;
  company: string | null;
  error: string;
  code: string;
  failedAt: Date;
};

export type ByokKeyGateResult = {
  /** True when AI source is Auto or My key (BYOK) and a customer-route key is required. */
  applies: boolean;
  /** False when BYOK is required but the key is missing, unreadable, or recently failing. */
  valid: boolean;
  reason: ByokKeyBlockReason | null;
  message: string | null;
  code: "key_missing" | "key_invalid" | null;
  lastJobFailure: LastJobKeyFailure | null;
};

export type ByokKeyGateSignals = {
  preference: AiSourcePreference;
  vaultKeyId: string | null;
  activeProvider: string | null;
  route: AiRouteResolution;
  unvaultOk: boolean | null;
  recentApiFailures60m: number;
  /** Successful customer-route API calls in the same window as failure counting. */
  recentApiSuccesses60m: number;
  lastJobFailure: LastJobKeyFailure | null;
};

/** Auto + My key (BYOK) — not EasySubmit system-only mode. */
export function usesByokAiPreference(preference: AiSourcePreference): boolean {
  return preference === "auto" || preference === "customer";
}

export function byokKeyGateApplies(
  preference: AiSourcePreference,
  vaultKeyId: string | null,
): boolean {
  if (!usesByokAiPreference(preference)) return false;
  if (preference === "customer") return true;
  return Boolean(vaultKeyId);
}

export function isKeyRelatedPipelineFailure(code: string | null | undefined): boolean {
  if (!code) return false;
  return (BYOK_PIPELINE_FAILURE_CODES as readonly string[]).includes(code);
}

export function isKeyRelatedPipelineError(error: string, code?: string | null): boolean {
  if (code === "quota_enhancement" || code === "quota_calls") return false;
  if (isKeyRelatedPipelineFailure(code)) return true;
  return /api key was rejected|invalid.?key|authentication|unauthorized|permission denied|vault/i.test(
    error,
  );
}

export function parsePipelineMetadataError(metadata: unknown): {
  error: string;
  code: string;
} | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const row = metadata as Record<string, unknown>;
  const error = typeof row.pipelineError === "string" ? row.pipelineError.trim() : "";
  if (!error) return null;
  const code =
    typeof row.pipelineErrorCode === "string" && row.pipelineErrorCode.trim()
      ? row.pipelineErrorCode.trim()
      : "tailor_failed";
  return { error, code };
}

export function formatLastJobKeyFailureMessage(failure: LastJobKeyFailure): string {
  const label = failure.company
    ? `${failure.title} at ${failure.company}`
    : failure.title;
  return `Your last job (${label}) failed because of your API key. Verify your key in AI Keys.`;
}

export function formatByokMissingKeyMessage(preference: AiSourcePreference): string {
  if (preference === "customer") {
    return "My key is selected but no API key is saved. Add your key in AI Keys.";
  }
  return "Add your API key in AI Keys to use AI with your own key.";
}

export function ignoreStaleKeyFailure(
  failure: LastJobKeyFailure | null,
  keyUpdatedAt: Date | null,
): LastJobKeyFailure | null {
  if (!failure || !keyUpdatedAt) return failure;
  return failure.failedAt >= keyUpdatedAt ? failure : null;
}

/** Pure BYOK gate — same rules for dashboard launch, health alert, and enhance preflight. */
export function evaluateByokKeyGate(signals: ByokKeyGateSignals): ByokKeyGateResult {
  const notApplicable: ByokKeyGateResult = {
    applies: false,
    valid: true,
    reason: null,
    message: null,
    code: null,
    lastJobFailure: null,
  };

  if (!byokKeyGateApplies(signals.preference, signals.vaultKeyId)) {
    return notApplicable;
  }

  if (signals.preference === "customer" && !signals.vaultKeyId) {
    return {
      applies: true,
      valid: false,
      reason: "missing_key",
      message: formatByokMissingKeyMessage("customer"),
      code: "key_missing",
      lastJobFailure: signals.lastJobFailure,
    };
  }

  if ("error" in signals.route && signals.route.error === "no_customer_key") {
    return {
      applies: true,
      valid: false,
      reason: "missing_key",
      message: formatByokMissingKeyMessage(signals.preference),
      code: signals.vaultKeyId ? "key_invalid" : "key_missing",
      lastJobFailure: signals.lastJobFailure,
    };
  }

  if (!("error" in signals.route) && signals.route.mode === "customer") {
    if (signals.unvaultOk === false) {
      return {
        applies: true,
        valid: false,
        reason: "vault_unreadable",
        message: "Your saved API key could not be read. Re-add it in AI Keys.",
        code: "key_invalid",
        lastJobFailure: signals.lastJobFailure,
      };
    }

    if (signals.recentApiFailures60m >= 1 && signals.recentApiSuccesses60m === 0) {
      return {
        applies: true,
        valid: false,
        reason: "recent_api_failures",
        message: "Your API key is failing. Check it in AI Keys settings.",
        code: "key_invalid",
        lastJobFailure: signals.lastJobFailure,
      };
    }

    if (
      signals.lastJobFailure &&
      isKeyRelatedPipelineError(signals.lastJobFailure.error, signals.lastJobFailure.code)
    ) {
      return {
        applies: true,
        valid: false,
        reason: "last_job_key_failure",
        message: formatLastJobKeyFailureMessage(signals.lastJobFailure),
        code: "key_invalid",
        lastJobFailure: signals.lastJobFailure,
      };
    }
  }

  return {
    applies: true,
    valid: true,
    reason: null,
    message: null,
    code: null,
    lastJobFailure: signals.lastJobFailure,
  };
}

export function byokKeyGateNotApplicable(): ByokKeyGateResult {
  return {
    applies: false,
    valid: true,
    reason: null,
    message: null,
    code: null,
    lastJobFailure: null,
  };
}
