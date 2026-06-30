export type ByokVaultStatus = "ACTIVE" | "INACTIVE";

export const BYOK_STATUS_LABEL: Record<ByokVaultStatus, string> = {
  ACTIVE: "Your API Key",
  INACTIVE: "Add API Key",
};

export function resolveByokVaultStatus(vaultKeyId?: string | null): ByokVaultStatus {
  return vaultKeyId ? "ACTIVE" : "INACTIVE";
}

export function byokStatusLabel(vaultKeyId?: string | null): string {
  return BYOK_STATUS_LABEL[resolveByokVaultStatus(vaultKeyId)];
}

export function byokStatusAriaLabel(vaultKeyId?: string | null): string {
  return resolveByokVaultStatus(vaultKeyId) === "ACTIVE"
    ? "Your API key is active — manage AI keys"
    : "Add API key — open AI key settings";
}
