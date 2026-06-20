export type IgnitionLockSource = "missing_key" | "auth_failure" | "vault_lock" | "manual";

export type LockIgnitionInput = {
  reason: string;
  source?: IgnitionLockSource;
};

export function isProviderAuthFailureCode(code?: string): boolean {
  return code === "invalid_key" || code === "unauthorized" || code === "forbidden";
}

export function formatIgnitionLockMessage(
  source: IgnitionLockSource,
  detail?: string | null,
): string {
  if (detail?.trim()) return detail.trim();

  switch (source) {
    case "missing_key":
      return "No valid API key configured. Re-enter your provider key to continue.";
    case "auth_failure":
      return "Your AI provider rejected the request (401). Update your key or model configuration.";
    case "vault_lock":
      return "Vaulted API key is missing or expired. Re-authenticate through the Ignition Gate.";
    default:
      return "Engine authentication required before continuing.";
  }
}
