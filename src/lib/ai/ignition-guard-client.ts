import { useIgnitionStore } from "@/src/stores/use-ignition-store";
import {
  formatIgnitionLockMessage,
  isProviderAuthFailureCode,
} from "@/src/lib/ai/ignition-guard";

/** Lock the global KeyProtector overlay after a provider 401/403 response. */
export function lockIgnitionForAuthFailure(message?: string, code?: string): void {
  if (code && !isProviderAuthFailureCode(code)) return;

  useIgnitionStore.getState().lockIgnition({
    reason: formatIgnitionLockMessage("auth_failure", message),
    source: "auth_failure",
  });
}

/** Lock the overlay when no BYOK key is available for an AI action. */
export function lockIgnitionForMissingKey(message?: string): void {
  useIgnitionStore.getState().lockIgnition({
    reason: formatIgnitionLockMessage("missing_key", message),
    source: "missing_key",
  });
}

/** Lock the overlay when vaulted BYOK cannot be decrypted (VAULT_LOCK). */
export function lockIgnitionForVaultLock(message?: string): void {
  useIgnitionStore.getState().lockIgnition({
    reason: formatIgnitionLockMessage("vault_lock", message),
    source: "vault_lock",
  });
}

export { isProviderAuthFailureCode } from "@/src/lib/ai/ignition-guard";
