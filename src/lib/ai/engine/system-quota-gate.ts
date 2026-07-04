import {
  checkAiQuota,
  quotaResetPatchIfNeeded,
  type QuotaCheckResult,
  type QuotaSnapshot,
  type UserQuotaRow,
} from "@/src/lib/ai/engine/quota";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";

export type SystemQuotaUserRow = {
  id: string;
  vaultKeyId: string | null;
  activeProvider: string | null;
  aiSourcePreference: string | null;
  aiEnhancementsToday: number;
  aiCallsToday: number;
  aiQuotaResetAt: Date;
  plan?: string | null;
  subscriptionStatus?: string | null;
};

export type SystemQuotaGateOptions = {
  isEnhancement?: boolean;
  estimatedCalls?: number;
  forceSystem?: boolean;
};

export type SystemQuotaBlockReason = "enhancement_limit" | "call_limit";

export type SystemQuotaGateResult = {
  /** True when the user is routed to EasySubmit system AI (daily system quota applies). */
  applies: boolean;
  /** True when system daily quota blocks the requested action. Only meaningful when `applies` is true. */
  exceeded: boolean;
  reason: SystemQuotaBlockReason | null;
  message: string | null;
  code: "quota_enhancement" | "quota_calls" | null;
  snapshot: QuotaSnapshot | null;
};

export const SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS = 1;
export const SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS = 1;

export function resolveQuotaRowWithReset(row: SystemQuotaUserRow): {
  quotaRow: UserQuotaRow;
  resetPatch: ReturnType<typeof quotaResetPatchIfNeeded>;
} {
  const base: UserQuotaRow = {
    aiEnhancementsToday: row.aiEnhancementsToday,
    aiCallsToday: row.aiCallsToday,
    aiQuotaResetAt: row.aiQuotaResetAt ?? new Date(),
  };
  const resetPatch = quotaResetPatchIfNeeded(base);
  if (!resetPatch) {
    return { quotaRow: base, resetPatch: null };
  }
  return {
    quotaRow: { ...base, ...resetPatch },
    resetPatch,
  };
}

export function formatSystemQuotaBlockedMessage(
  check: Extract<QuotaCheckResult, { ok: false }>,
): string {
  const { snapshot } = check;
  if (check.reason === "enhancement_limit") {
    return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Add your API key for more.`;
  }
  return `Daily AI call limit reached (${snapshot.callsLimit}/day). Add your API key or try again tomorrow.`;
}

/** Pure gate — only evaluates EasySubmit **system** daily quota. */
export function evaluateSystemQuotaGate(
  quotaRow: UserQuotaRow,
  aiEngine: AiEngineConfig,
  options: SystemQuotaGateOptions = {},
): SystemQuotaGateResult {
  const quotaCheck = checkAiQuota(quotaRow, aiEngine, "system", {
    isEnhancement: options.isEnhancement ?? true,
    estimatedCalls: options.estimatedCalls ?? SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
  });

  if (quotaCheck.ok) {
    return {
      applies: true,
      exceeded: false,
      reason: null,
      message: null,
      code: null,
      snapshot: null,
    };
  }

  return {
    applies: true,
    exceeded: true,
    reason: quotaCheck.reason,
    message: formatSystemQuotaBlockedMessage(quotaCheck),
    code: quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
    snapshot: quotaCheck.snapshot,
  };
}

export function systemQuotaGateNotApplicable(): SystemQuotaGateResult {
  return {
    applies: false,
    exceeded: false,
    reason: null,
    message: null,
    code: null,
    snapshot: null,
  };
}
