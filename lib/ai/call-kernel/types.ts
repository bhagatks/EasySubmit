import type { EnhanceProviderErrorCode } from "@/src/lib/ai/engine/map-enhance-provider-error";

export type AiCallExecutor = "customer" | "system_pool";

export type AiCallClassification =
  | "success"
  | "parse_failed"
  | "empty_response"
  | "transient"
  | "rate_limited"
  | "auth"
  | "quota_exhausted"
  | "capacity_exhausted"
  | "permanent"
  | "provider_error";

export type AiCallDecisionAction =
  | "mission_success"
  | "retry_same"
  | "escalate_system"
  | "escalate_slot"
  | "mission_failed";

export type AiCallTarget = {
  executor: AiCallExecutor;
  routeMode: "customer" | "system";
  slot?: number;
  attemptOnTarget: number;
};

export type AiCallLedgerEntry = {
  attempt: number;
  executor: AiCallExecutor;
  routeMode: "customer" | "system";
  slot?: number;
  provider?: string;
  modelId?: string;
  classification: AiCallClassification;
  decision: AiCallDecisionAction;
  durationMs: number;
  tokensUsed?: number;
  errorCode?: EnhanceProviderErrorCode | string;
  errorMessage?: string;
};

export type AiCallExecuteResult = {
  text: string;
  tokensUsed: number;
  modelId: string;
  estimatedCost: number;
  slot?: number;
  provider?: string;
  durationMs: number;
};

export type AiEnhanceOutcomeAction = "fix_key" | "add_key" | "enable_ai" | "wait" | null;

export type AiEnhanceOutcome = {
  aiAttempted: boolean;
  aiSucceeded: boolean;
  engineMode: "ai" | "deterministic";
  aiBlockCode?: string | null;
  warning?: string | null;
  action?: AiEnhanceOutcomeAction;
  actionHref?: string | null;
  aiCallLedger?: AiCallLedgerEntry[];
};
