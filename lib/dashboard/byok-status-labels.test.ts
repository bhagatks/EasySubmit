import { describe, expect, it } from "vitest";
import {
  BYOK_STATUS_LABEL,
  byokStatusAriaLabel,
  byokStatusLabel,
  resolveByokVaultStatus,
} from "@/lib/dashboard/byok-status-labels";

describe("byok-status-labels", () => {
  it("resolves vault status from vaultKeyId", () => {
    expect(resolveByokVaultStatus("vault-1")).toBe("ACTIVE");
    expect(resolveByokVaultStatus(null)).toBe("INACTIVE");
    expect(resolveByokVaultStatus(undefined)).toBe("INACTIVE");
  });

  it("returns user-facing labels", () => {
    expect(byokStatusLabel("vault-1")).toBe(BYOK_STATUS_LABEL.ACTIVE);
    expect(byokStatusLabel(null)).toBe(BYOK_STATUS_LABEL.INACTIVE);
  });

  it("returns aria labels", () => {
    expect(byokStatusAriaLabel("vault-1")).toContain("active");
    expect(byokStatusAriaLabel(null)).toMatch(/add api key/i);
  });
});
