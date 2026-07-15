import { describe, expect, it } from "vitest";
import { createExtensionToken } from "@/lib/extension/auth-token";
import { readExtensionTokenUserId } from "@/src/shared/extension/auth-token-payload";

describe("readExtensionTokenUserId", () => {
  it("reads user id from a valid extension token", () => {
    process.env.EXTENSION_TOKEN_SECRET = "test-secret";
    const token = createExtensionToken("user-abc", 60_000);
    expect(readExtensionTokenUserId(token)).toBe("user-abc");
  });

  it("returns null for malformed tokens", () => {
    expect(readExtensionTokenUserId(null)).toBeNull();
    expect(readExtensionTokenUserId("not-a-token")).toBeNull();
  });
});
