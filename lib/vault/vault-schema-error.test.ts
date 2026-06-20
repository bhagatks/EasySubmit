import { describe, expect, it } from "vitest";
import {
  isVaultSchemaMissingError,
  VAULT_SETUP_MESSAGE,
} from "@/lib/vault/vault-schema-error";

describe("vault-schema-error", () => {
  it("detects missing vault_user_key function", () => {
    expect(
      isVaultSchemaMissingError(
        new Error(
          'function public.vault_user_key(unknown, unknown, unknown) does not exist',
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated prisma errors", () => {
    expect(isVaultSchemaMissingError(new Error("Unique constraint failed"))).toBe(
      false,
    );
  });

  it("detects pgsodium permission errors from legacy vault inserts", () => {
    expect(
      isVaultSchemaMissingError(
        new Error("permission denied for function _crypto_aead_det_noncegen"),
      ),
    ).toBe(true);
  });

  it("includes vault-functions-only.sql in setup message", () => {
    expect(VAULT_SETUP_MESSAGE).toContain("vault-functions-only.sql");
  });
});
