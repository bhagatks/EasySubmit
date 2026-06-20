import type { ExecuteEngineRefinementResult } from "@/src/lib/ai/engine-types";

export function isVaultLockResult(
  result: ExecuteEngineRefinementResult,
): result is Extract<ExecuteEngineRefinementResult, { status: "VAULT_LOCK" }> {
  return !result.success && result.status === "VAULT_LOCK";
}

/** When true, client should call `lockIgnitionForVaultLock` and open Ignition Gate. */
export function shouldTriggerIgnitionGate(
  result: ExecuteEngineRefinementResult,
): boolean {
  return isVaultLockResult(result);
}
